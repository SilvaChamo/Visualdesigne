import { supabase } from '@/lib/supabase'

export interface ContactForm {
  name: string
  email: string
  phone?: string
  message: string
  service?: string
}

export const contactService = {
  async submitContactForm(formData: ContactForm) {
    const { data, error } = await supabase
      .from('contacts')
      .insert([
        {
          ...formData,
          created_at: new Date().toISOString(),
          status: 'pending'
        }
      ])
    
    return { data, error }
  },

  async getContacts() {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })
    
    return { data, error }
  },

  async updateContactStatus(id: string, status: 'pending' | 'read' | 'replied') {
    const { data, error } = await supabase
      .from('contacts')
      .update({ status })
      .eq('id', id)
    
    return { data, error }
  }
}
