import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const translations = {
  en: {
    // App
    appName: '语闻',
    appSubtitle: 'A way to beat WeChat',

    // Auth
    login: 'Login',
    register: 'Register',
    username: 'Username',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    loginBtn: 'Login',
    registerBtn: 'Register',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    registerHere: 'Register here',
    loginHere: 'Login here',

    // Chat
    myCode: 'My Code',
    addFriend: 'Add Friend',
    newGroup: 'New Group',
    joinGroup: 'Join Group',
    friendRequests: 'Friend Requests',
    friends: 'Friends',
    groups: 'Groups',
    online: 'Online',
    offline: 'Offline',
    noFriends: 'No friends yet',
    noGroups: 'No groups yet',
    selectChat: 'Select a chat to start messaging',
    encrypted: 'Your messages are end-to-end encrypted',
    typeMessage: 'Type a message...',
    sent: 'Sent',
    delivered: 'Delivered',
    read: 'Read',
    edited: 'edited',
    accept: 'Accept',
    reject: 'Reject',

    // Message actions
    edit: 'Edit',
    delete: 'Delete',
    deleteMessage: 'Delete Message',
    deleteForMe: 'Delete for me',
    deleteForBoth: 'Delete for both',
    cancel: 'Cancel',
    save: 'Save',
    editMessage: 'Edit Message',
    confirmDelete: 'Are you sure you want to delete this message?',
    alsoDeleteForOther: 'Also delete for the other person',

    // Modals
    searchByCode: 'Search by friend code',
    friendCode: 'Friend Code',
    search: 'Search',
    userNotFound: 'User not found',
    sendRequest: 'Send Request',
    requestSent: 'Request sent!',
    groupName: 'Group Name',
    create: 'Create',
    groupCode: 'Group Code',
    join: 'Join',
    leave: 'Leave Group',
    members: 'members',

    // Settings
    settings: 'Settings',
    language: 'Language',
    english: 'English',
    chinese: '中文',
    logout: 'Logout',
    darkMode: 'Dark Mode',

    // Admin
    adminPanel: 'Admin Panel',
    backToChat: 'Back to Chat',
    totalUsers: 'Total Users',
    messages: 'Messages',
    friendships: 'Friendships',
    users: 'Users',
    actions: 'Actions',
    created: 'Created',
    admin: 'Admin',
    user: 'User',
    private: 'Private',
    group: 'Group',
    status: 'Status',
    from: 'From',
    to: 'To',
    type: 'Type',
    previous: 'Previous',
    next: 'Next',
    editUser: 'Edit User',
    newPassword: 'New Password (leave empty to keep)',
    confirmDeleteUser: 'Delete user "{username}"? This cannot be undone.',
    confirmDeleteGroup: 'Delete group "{name}"? This cannot be undone.',
    confirmDeleteMessage: 'Delete this message? This cannot be undone.',

    // File
    fileTooLarge: 'File too large. Maximum size is 10MB.',
    uploadFailed: 'Failed to send file',

    // Unlock
    unlockTitle: 'Unlock Session',
    unlockDescription: 'Enter your password to decrypt your private key',
    unlock: 'Unlock',
    unlocking: 'Unlocking...',
    invalidPassword: 'Invalid password',

    // Updates
    updates: 'Updates',
    currentVersion: 'Current Version',
    branch: 'Branch',
    commit: 'Commit',
    checkUpdates: 'Check Updates',
    applyUpdate: 'Apply Update',
    selectBranch: 'Select Branch',
    noUpdates: 'Already up to date',
    updatesAvailable: 'Updates available',
    filesChanged: 'Files changed',
    newCommits: 'New commits',
    updating: 'Updating...',
    updateSuccess: 'Update successful!',
    updateFailed: 'Update failed',
    localChanges: 'Local changes detected',
    stashChanges: 'Stash local changes',
    databaseWarning: 'Warning: Database files may be affected',
    restartRequired: 'Restart Required',
    autoBuild: 'Auto Build',
    autoRestart: 'Auto Restart',
    stageFetching: 'Fetching code...',
    stageMerging: 'Merging updates...',
    stageInstalling: 'Installing dependencies...',
    stageBuilding: 'Building client...',
    stageRestarting: 'Restarting server...',
    buildFailed: 'Build failed',
    serverRestarting: 'Server is restarting, please wait...',
    clientChanged: 'Client files changed',
    serverChanged: 'Server files changed',
    reconnecting: 'Reconnecting...'
  },
  zh: {
    // App
    appName: '语闻',
    appSubtitle: '是一个干翻微信的方式',

    // Auth
    login: '登录',
    register: '注册',
    username: '用户名',
    password: '密码',
    confirmPassword: '确认密码',
    loginBtn: '登录',
    registerBtn: '注册',
    noAccount: '没有账号？',
    hasAccount: '已有账号？',
    registerHere: '点此注册',
    loginHere: '点此登录',

    // Chat
    myCode: '我的代码',
    addFriend: '添加好友',
    newGroup: '新建群组',
    joinGroup: '加入群组',
    friendRequests: '好友请求',
    friends: '好友',
    groups: '群组',
    online: '在线',
    offline: '离线',
    noFriends: '还没有好友',
    noGroups: '还没有群组',
    selectChat: '选择一个聊天开始发消息',
    encrypted: '您的消息已端对端加密',
    typeMessage: '输入消息...',
    sent: '已发送',
    delivered: '已送达',
    read: '已读',
    edited: '已编辑',
    accept: '接受',
    reject: '拒绝',

    // Message actions
    edit: '编辑',
    delete: '删除',
    deleteMessage: '删除消息',
    deleteForMe: '仅删除我的',
    deleteForBoth: '双方都删除',
    cancel: '取消',
    save: '保存',
    editMessage: '编辑消息',
    confirmDelete: '确定要删除这条消息吗？',
    alsoDeleteForOther: '同时删除对方的消息',

    // Modals
    searchByCode: '通过好友代码搜索',
    friendCode: '好友代码',
    search: '搜索',
    userNotFound: '未找到用户',
    sendRequest: '发送请求',
    requestSent: '请求已发送！',
    groupName: '群组名称',
    create: '创建',
    groupCode: '群组代码',
    join: '加入',
    leave: '退出群组',
    members: '成员',

    // Settings
    settings: '设置',
    language: '语言',
    english: 'English',
    chinese: '中文',
    logout: '退出登录',
    darkMode: '深色模式',

    // Admin
    adminPanel: '管理员面板',
    backToChat: '返回聊天',
    totalUsers: '用户总数',
    messages: '消息',
    friendships: '好友关系',
    users: '用户',
    actions: '操作',
    created: '创建时间',
    admin: '管理员',
    user: '用户',
    private: '私聊',
    group: '群组',
    status: '状态',
    from: '发送者',
    to: '接收者',
    type: '类型',
    previous: '上一页',
    next: '下一页',
    editUser: '编辑用户',
    newPassword: '新密码（留空保持不变）',
    confirmDeleteUser: '删除用户"{username}"？此操作无法撤销。',
    confirmDeleteGroup: '删除群组"{name}"？此操作无法撤销。',
    confirmDeleteMessage: '删除这条消息？此操作无法撤销。',

    // File
    fileTooLarge: '文件太大，最大支持10MB。',
    uploadFailed: '发送文件失败',

    // Unlock
    unlockTitle: '解锁会话',
    unlockDescription: '输入密码解锁您的私钥',
    unlock: '解锁',
    unlocking: '解锁中...',
    invalidPassword: '密码错误',

    // Updates
    updates: '系统更新',
    currentVersion: '当前版本',
    branch: '分支',
    commit: '提交',
    checkUpdates: '检查更新',
    applyUpdate: '应用更新',
    selectBranch: '选择分支',
    noUpdates: '已是最新版本',
    updatesAvailable: '有可用更新',
    filesChanged: '文件变更',
    newCommits: '新提交',
    updating: '更新中...',
    updateSuccess: '更新成功！',
    updateFailed: '更新失败',
    localChanges: '检测到本地修改',
    stashChanges: '暂存本地修改',
    databaseWarning: '警告：数据库文件可能受影响',
    restartRequired: '需要重启',
    autoBuild: '自动构建',
    autoRestart: '自动重启',
    stageFetching: '正在获取代码...',
    stageMerging: '正在合并更新...',
    stageInstalling: '正在安装依赖...',
    stageBuilding: '正在构建前端...',
    stageRestarting: '正在重启服务器...',
    buildFailed: '构建失败',
    serverRestarting: '服务器正在重启，请稍候...',
    clientChanged: '前端文件已更新',
    serverChanged: '后端文件已更新',
    reconnecting: '正在重新连接...'
  }
}

export const useLanguageStore = defineStore('language', () => {
  const currentLang = ref(localStorage.getItem('lang') || 'en')

  const t = computed(() => {
    return (key, params = {}) => {
      let text = translations[currentLang.value]?.[key] || translations.en[key] || key
      // Replace parameters like {username}
      Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param])
      })
      return text
    }
  })

  function setLanguage(lang) {
    currentLang.value = lang
    localStorage.setItem('lang', lang)
  }

  return {
    currentLang,
    t,
    setLanguage
  }
})
