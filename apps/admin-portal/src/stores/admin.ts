import { defineStore } from 'pinia'

export type Tenant = {
  email: string
  subscriptionStatus: string
}

type AdminState = {
  tenants: Tenant[]
}

export const useAdminStore = defineStore('admin', {
  state: (): AdminState => ({
    tenants: []
  }),

  actions: {
    async fetchTenants() {
      // TODO: replace with real API call when ready
      // For now, sample data so you can verify the UI renders.
      this.tenants = [
        { email: 'user1@example.com', subscriptionStatus: 'active' },
        { email: 'user2@example.com', subscriptionStatus: 'canceled' }
      ]
    }
  }
})
