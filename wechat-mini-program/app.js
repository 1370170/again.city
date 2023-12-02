// app.js
App({
    onLaunch: () => {
      wx.cloud.init({traceUser: true});   // initialize serverless database and functions
    }
  })
  