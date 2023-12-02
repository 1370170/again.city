import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client);

// Posts is an Amazon DynamoDB table with the following schema:
// PostYear, PostCity, FromName, ToName, Message; PostID, HardwareID, IP, PostTimestamp

export const handler = async (event, context) => {

    // in: postYear, postCity, fromName, toName, message, hardwareID
    // computed: postID, ip, postTimestamp
    // out: hasResponse, responseMessage  
    
    const cors = { 
        'headers': { 
            "Access-Control-Allow-Headers" : "Content-Type",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        }
    };
    
   if(event.httpMethod === 'OPTIONS') {
        return {
            ...cors,
            statusCode: 200,
            body: "This was a preflight call."
        }
    }

    let body = JSON.parse(event.body);  
    // if error, just 502. i trust the server will reflect... 
    // oh, "out of security reasons" you'll get no info
    // and you lost CORS header, so client-side will report CORS error.
    // great encapsulation AWS!
    const {
        postYear,
        postCity,
        fromName,
        toName,
        message,
        hardwareID,
    } = body;
    var ip = event.requestContext.identity.sourceIp;
    
    if (!postYear || !postCity || !fromName || !toName || !message || !hardwareID || !ip)
    return { ...cors, statusCode: 400, body: "Missing required parameters " };
    
    if (await isTooFrequent(hardwareID, ip)) 
    return { ...cors, statusCode: 429, body: "Too many requests" };
    
    if (await isMultipleFrom(hardwareID, ip, fromName))
    return { ...cors, statusCode: 403, body: "Multiple 'fromName'" };
    
    await insertUpdateData(postYear, postCity, fromName, toName, message, hardwareID, ip);
    
    const { hasResponse, responseMessage } = await getResponse(postYear, postCity, fromName, toName);
    
    if (hasResponse) {
        return { ...cors, statusCode: 200, body: responseMessage };
    } else {
        return { ...cors, statusCode: 204 };
    }
};

// [AWS SDK v3/DynamoDB/Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStarted.Scan.html)
// [AWS SDK v3/DynamoDB/API Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/command/ScanCommand/)

const isTooFrequent = async (hardwareID, ip) => {
    const command = new ScanCommand({ 
        TableName: "Posts",
        ExpressionAttributeValues: {
            ":hardwareID": hardwareID,  // doc says ":hardwareID": { "S": hardwareID }, but Amazon Lambda complains about > "M" data type. apparently marshalling implicitly happens. QoS AWS.
            ":ip": ip,
            ":aMonthAgo": Date.now() - 1000 * 60 * 60 * 24 * 30
        },
        FilterExpression: "(HardwareID = :hardwareID OR IP = :ip) AND PostTimestamp > :aMonthAgo"
    });
    const result = await db.send(command);
    return result.Count > 0;
};

const isMultipleFrom = async (hardwareID, ip, fromName) => {
    const command = new ScanCommand({ 
        TableName: "Posts",
        ExpressionAttributeValues: {
            ":hardwareID": hardwareID,
            ":ip": ip,
            ":fromName": fromName
        },
        FilterExpression: "(HardwareID = :hardwareID OR IP = :ip) AND FromName <> :fromName"
    });
    const result = await db.send(command);
    return result.Count > 0;
}

const insertUpdateData = async (postYear, postCity, fromName, toName, message, hardwareID, ip) => {
    const command = new PutCommand({
        TableName: "Posts",
        Item: {
            "PostYear": postYear,
            "PostCity": postCity,
            "FromName": fromName,
            "ToName": toName,
            "Message": message,
            "PostID": `${Date.now()}-${Math.floor(Math.random() * 1000000)}`, // millisecond + a random number. npm install uuid would require a .zip deployment package.,
            "HardwareID": hardwareID,
            "IP": ip,
            "PostTimestamp": Date.now()
        }
    });
    await db.send(command);
}

const getResponse = async (postYear, postCity, fromName, toName) => {
    const command = new ScanCommand({
        TableName: "Posts",
        ExpressionAttributeValues: {
            ":postYear": postYear,
            ":postCity": postCity,
            ":fromName": fromName,
            ":toName": toName
        },
        FilterExpression: "PostYear = :postYear AND PostCity = :postCity AND FromName = :toName AND ToName = :fromName"
    });
    const result = await db.send(command);
    if (result.Count === 0) {
        return { hasResponse: false };
    } else {
        const responseMessage = result.Items[0].Message;
        return { hasResponse: true, responseMessage: responseMessage };
    }
}