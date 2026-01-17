const API_BASE = '/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('token')

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    },
    ...options
  }

  const response = await fetch(`${API_BASE}${path}`, config)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

export const api = {
  // Auth
  register: (data) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  login: (data) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getMe: () => request('/auth/me'),

  // Friends
  searchUser: (code) => request(`/friends/search/${code}`),

  sendFriendRequest: (friendId) => request('/friends/request', {
    method: 'POST',
    body: JSON.stringify({ friendId })
  }),

  acceptFriend: (requestId) => request('/friends/accept', {
    method: 'POST',
    body: JSON.stringify({ requestId })
  }),

  deleteFriend: (id) => request(`/friends/request/${id}`, {
    method: 'DELETE'
  }),

  getFriends: () => request('/friends'),

  // Groups
  createGroup: (data) => request('/groups', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  joinGroup: (data) => request('/groups/join', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  getGroups: () => request('/groups'),

  getGroup: (id) => request(`/groups/${id}`),

  leaveGroup: (id) => request(`/groups/${id}/leave`, {
    method: 'DELETE'
  }),

  // Messages
  getPrivateMessages: (friendId, params) => {
    const query = new URLSearchParams(params).toString()
    return request(`/messages/private/${friendId}?${query}`)
  },

  getGroupMessages: (groupId, params) => {
    const query = new URLSearchParams(params).toString()
    return request(`/messages/group/${groupId}?${query}`)
  },

  markRead: (messageIds) => request('/messages/read', {
    method: 'POST',
    body: JSON.stringify({ messageIds })
  }),

  // Admin
  adminGetStats: () => request('/admin/stats'),

  adminGetUsers: () => request('/admin/users'),

  adminGetUser: (id) => request(`/admin/users/${id}`),

  adminUpdateUser: (id, data) => request(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),

  adminDeleteUser: (id) => request(`/admin/users/${id}`, {
    method: 'DELETE'
  }),

  adminGetGroups: () => request('/admin/groups'),

  adminDeleteGroup: (id) => request(`/admin/groups/${id}`, {
    method: 'DELETE'
  }),

  adminGetMessages: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/admin/messages?${query}`)
  },

  adminDeleteMessage: (id) => request(`/admin/messages/${id}`, {
    method: 'DELETE'
  }),

  // Upload
  uploadFile: async (file) => {
    const token = localStorage.getItem('token')
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed')
    }
    return data
  }
}
