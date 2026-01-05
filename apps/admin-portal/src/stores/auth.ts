import { defineStore } from 'pinia'
import { ref } from 'vue'
import jwt_decode from 'jwt-decode'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(null)
  const roles = ref<string[]>([])

  function setUser(idToken: string) {
    const decoded = jwt_decode<{ [key: string]: any }>(idToken)
    user.value = decoded

    // Custom claim (adjust to your namespace)
    roles.value = decoded['https://superapp.example.com/roles'] || []
  }

  return {
    user,
    roles,
    setUser,
  }
})
