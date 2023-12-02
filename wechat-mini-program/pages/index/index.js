const CryptoJS = require('crypto-js');
import Message from 'tdesign-miniprogram/message/index';
const db = wx.cloud.database();

Page({
  data: {
    // data
    from: '',
    to: '',
    year: '',
    city: '',
    message: '',
    // ui
    readOnly: false
  },

  handleInput(event) {
    let { key } = event.currentTarget.dataset;
    this.setData({  
      [key]: event.detail.value,
    });
  },

  async handleQuery(e) {  // controller
    if (await this.isSecondPostAndDifferent()) {
      this.ui_error('发信人与收件人应有唯一性');  return;   // linear message is really not for tree program
    }

    this.saveToCloud();
    this.saveToLocalStorage();

    let { hasReply, replyMessage } = await this.findReply(); // error-first callback pattern   // not try-catch bc wx.cloud rethrows
    if (hasReply) { 
      this.ui_info('来自' + this.data.to + '的回信');
      this.ui_reply(replyMessage);
    }
    else { 
      this.ui_info('信件已寄存'); 
    }
    this.ui_disable();
  },

  onShow: function () {   // for some reason async function() doesn't work
    let db = wx.cloud.database();
    var { from, to, year, city, message } = wx.getStorageSync('data');
    if (from === undefined) { return; }   // no local cache, skip this function
    this.setData({ from, to, year, city, message });

    this.findReply()    // variant of findReply in handleQuery
      .then(({ hasReply, replyMessage }) => {
        if (hasReply) { 
          this.ui_info('来自' + to + '的回信');
          this.ui_reply(replyMessage);
          this.ui_disable();
        }
      });
  },

  // component
  async isSecondPostAndDifferent() {
    // encrypt
    let { from, to, year, city, message } = this.data;
    let from_to_year_city_x = CryptoJS.SHA256(from + to + year + city).toString();
    let message_x_to_city = CryptoJS.AES.encrypt(message, to + city).toString();

    // query
    return (await wx.cloud.callFunction({
      name: 'isSecondPostAndDifferent',
      data: {
        // id: _openid,
        // _openid,
        from_to_year_city_x: from_to_year_city_x,
        message_x_to_city: message_x_to_city
      },
    })).result;
  },

  saveToCloud() {
    // encrypt
    let { from, to, year, city, message } = this.data;
    let from_to_year_city_x = CryptoJS.SHA256(from + to + year + city).toString();
    let message_x_to_city = CryptoJS.AES.encrypt(message, to + city).toString();

    // save
    wx.cloud.callFunction({
      name: 'saveToCloud',
      data: {
        // id: _openid,
        // _openid,
        from_to_year_city_x: from_to_year_city_x,
        message_x_to_city: message_x_to_city
      },
    });
  },

  saveToLocalStorage() {
    wx.setStorageSync('data', this.data);
  },

  async findReply() {
    let { from, to, year, city } = this.data;
    let to_from_year_city_x = CryptoJS.SHA256(to + from + year + city).toString();

    let posts = await db.collection('posts')
      .aggregate()
      .match({
        from_to_year_city_x: to_from_year_city_x,
      })
      .end();

    if (posts.list.length === 0) { return { hasReply: false }; }
    else { 
      let replyMessage = CryptoJS.AES.decrypt(posts.list[0].message_x_to_city, from + city).toString(CryptoJS.enc.Utf8);
      return { hasReply: true, replyMessage: replyMessage };
    }
  },

  ui_reply(replyMessage) {
    this.setData({
      from: this.data.to,
      to: this.data.from,
      message: replyMessage,
    });
    
  },

  ui_disable() {
    this.setData({
      readOnly: true,
    });
  },

  ui_error(message) {
    Message.error({
      context: this,
      offset: [20, 32],
      duration: 5000,
      content: message,
    });
  },

  ui_info(message) {
    Message.info({
      context: this,
      offset: [20, 32],
      duration: 5000,
      content: message,
    });
  },
    
})
