import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';

import 'dart:convert';
import 'dart:typed_data';
import 'package:encrypt/encrypt.dart' as encrypt;
import 'package:crypto/crypto.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '表白墙',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
      ),
      home: MyHomePage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class MyHomePage extends StatefulWidget {
  @override
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  var year = '';
  var city = '';
  var from = '';
  var to = '';
  var message = '';

  var myYearController = TextEditingController(); // not declarative, user-bound
  var myCityController = TextEditingController();
  var myFromController = TextEditingController();
  var myToController = TextEditingController();
  var myMessageController = TextEditingController();

  var status = 0; // HTTP status code. 0, 200, 204, 400, 429, 403. Happens to coincide with Lambda.
  var reason = '';

  @override
  void dispose() {
    myYearController.dispose();
    myCityController.dispose();
    myFromController.dispose();
    myToController.dispose();
    myMessageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ConstrainedBox(
              constraints: BoxConstraints(maxWidth: 600),
              child: Padding(
                padding: const EdgeInsets.all(40.0),
                child: Column(
                  children: [
                    TextField(
                      controller: myYearController,
                      readOnly: (status==200) || (status==204),
                      decoration: InputDecoration(
                        border: OutlineInputBorder(),
                        floatingLabelBehavior: FloatingLabelBehavior.always,
                        labelText: '在',
                        hintText: '哪一年',
                      ),
                    ),
                    SizedBox(height: 28),
                    TextField(
                      controller: myCityController,
                      readOnly: (status==200) || (status==204),
                      decoration: InputDecoration(
                        border: OutlineInputBorder(),
                        floatingLabelBehavior: FloatingLabelBehavior.always,
                        labelText: '的',
                        hintText: '哪个城市',
                      ),
                    ),
                    SizedBox(height: 28),
                    TextField(
                      controller: myFromController,
                      readOnly: (status==200) || (status==204),
                      decoration: InputDecoration(
                        border: OutlineInputBorder(),
                        floatingLabelBehavior: FloatingLabelBehavior.always,
                        labelText: '有',
                        hintText: '谁',
                      ),
                    ),
                    SizedBox(height: 28),
                    TextField(
                      controller: myToController,
                      readOnly: (status==200) || (status==204),
                      decoration: InputDecoration(
                        border: OutlineInputBorder(),
                        labelText: '对',
                        floatingLabelBehavior: FloatingLabelBehavior.always,
                        hintText: '谁',
                      ),
                    ),
                    SizedBox(height: 28),
                    TextField(
                      controller: myMessageController,
                      readOnly: (status==200) || (status==204),
                      decoration: InputDecoration(
                        border: OutlineInputBorder(),
                        floatingLabelBehavior: FloatingLabelBehavior.always,
                        labelText: '说',
                        hintText: '爱我',
                        suffixIcon: myMessageController.text.isNotEmpty & (status!=200) & (status!=204) ? IconButton(
                          icon: Icon(Icons.send_outlined), 
                          onPressed: () async {            
                            setState(() {
                              year = myYearController.text;
                              city = myCityController.text;
                              from = myFromController.text;
                              to = myToController.text;
                              message = myMessageController.text;
                            });

                            if (year.isEmpty || city.isEmpty || from.isEmpty || to.isEmpty || message.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('请填写所有信息'),
                                ),
                              );
                              return;
                            }
            
                            var url = Uri.https('3i1k01vzv8.execute-api.ap-east-1.amazonaws.com', 'default/postExport');
                            var response = await http.post(
                              url, 
                              headers: {
                                  'Content-Type': 'application/json; charset=UTF-8',
                              },
                              body: jsonEncode({
                                'postYear': encryptAes(year, city),
                                'postCity': encryptAes(city, year),
                                'fromName': encryptAes(from, to),
                                'toName': encryptAes(to, from),
                                'message': encryptAes(message, to),
                                'hardwareID': await _getId(),
                              }),
                            );
            
                            setState(() {
                              status = response.statusCode;
                              reason = response.body;
                            });
            
                            if (status == 200) {  // build is declarative. user-bound Controller is declarative. you can't be declarative in two places.
                              myFromController.text = to;
                              myToController.text = from;
                              myMessageController.text = decryptAes(reason, from);
                            }
            
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  () {
                                    switch (status) {
                                      case 200:
                                        return '来自$to的回复';
                                      case 204:
                                        return '消息已寄存';
                                      default:
                                        return '错误：$reason';
                                    }
                                  }()
                                ),
                              ),
                            );
                          },
                        ) : null,
                      ),
                      onChanged: (value) {
                        setState(() {});
                      },
                    ),
                    SizedBox(height: 128),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  _getId() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
      if (prefs.containsKey('hardwareID')) {
        return prefs.getString('hardwareID');
      } else {
        var uuid = Uuid();
        var hardwareID = uuid.v4();
        prefs.setString('hardwareID', hardwareID);
        return hardwareID;
      }
  }
}

String encryptAes(String plainText, String keyString) { // GPT
  final rawKey = sha256.convert(utf8.encode(keyString)).bytes;
  final key = encrypt.Key(Uint8List.fromList(rawKey));
  final iv = encrypt.IV.fromLength(16);

  final encrypter = encrypt.Encrypter(encrypt.AES(key, mode: encrypt.AESMode.sic));

  final encrypted = encrypter.encrypt(plainText, iv: iv);
  return encrypted.base64;
}

String decryptAes(String encryptedText, String keyString) {
  final rawKey = sha256.convert(utf8.encode(keyString)).bytes;
  final key = encrypt.Key(Uint8List.fromList(rawKey));
  final iv = encrypt.IV.fromLength(16);

  final encrypter = encrypt.Encrypter(encrypt.AES(key, mode: encrypt.AESMode.sic));

  final decrypted = encrypter.decrypt64(encryptedText, iv: iv);
  return decrypted;
}