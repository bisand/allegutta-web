export default defineNuxtPlugin(() => {
  // Add authentication interceptor for $fetch
  $fetch.create({
    onRequest({ options }) {
      // Get token from cookie
      const tokenCookie = useCookie('kinde-token')
      if (tokenCookie.value) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${tokenCookie.value}`
        }
      }
    }
  })
})
