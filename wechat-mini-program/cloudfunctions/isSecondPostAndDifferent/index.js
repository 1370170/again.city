// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }); // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  let db = cloud.database();
  let { OPENID } = cloud.getWXContext();

  let { from_to_year_city_x, message_x_to_city } = event; // AES is non-deteministic (initialization vector)

  try {
    let posts = await db.collection('posts').doc(OPENID).get();
    return posts && posts.data.from_to_year_city_x != from_to_year_city_x;
  } catch (e) {
    return false;
  }
}