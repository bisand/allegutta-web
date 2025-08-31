export default defineEventHandler(async (event) => {
  // Simple demo login - in production you'd validate credentials
  // await setUserSession(event, {
  //   user: {
  //     id: 'demo_user_1',
  //     email: 'demo@allegutta.com',
  //     name: 'Demo User',
  //     avatar: 'https://ui-avatars.com/api/?name=Demo+User&background=0ea5e9&color=fff',
  //     given_name: 'Demo',
  //     family_name: 'User'
  //   },
  //   loggedInAt: Date.now()
  // })
  
  return sendRedirect(event, '/')
})
