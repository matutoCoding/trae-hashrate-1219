export default defineAppConfig({
  pages: [
    'pages/schedule/index',
    'pages/classroom/index',
    'pages/student/index',
    'pages/mine/index',
    'pages/booking-detail/index',
    'pages/booking-create/index',
    'pages/classroom-edit/index',
    'pages/student-detail/index',
    'pages/rank-upgrade/index',
    'pages/credit-pool/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2D5B89',
    navigationBarTitleText: '围棋教室排课',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#2D5B89',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/schedule/index',
        text: '排课'
      },
      {
        pagePath: 'pages/classroom/index',
        text: '教室'
      },
      {
        pagePath: 'pages/student/index',
        text: '学员'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
