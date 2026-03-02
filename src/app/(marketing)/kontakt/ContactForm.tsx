'use client'

import { useState, FormEvent } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003'

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

export default function ContactForm() {
  const [status, setStatus] = useState<FormStatus>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('submitting')
    setMessage('')

    const form = e.currentTarget
    const formData = new FormData(form)

    // Convert FormData to JSON for the backend
    const payload = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      company: formData.get('company'),
      message: formData.get('message'),
      sourcePage: formData.get('sourcePage'),
    }

    try {
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setStatus('error')
        setMessage(data.error || 'Noget gik galt. Prøv igen om et øjeblik.')
        return
      }

      setStatus('success')
      setMessage(data.message || 'Tak for din besked! Vi vender tilbage hurtigst muligt.')
      form.reset()
    } catch (error) {
      console.error('Contact form error:', error)
      setStatus('error')
      setMessage('Noget gik galt. Prøv igen om et øjeblik.')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8">
      <h2 className="text-2xl font-bold text-navy mb-6">Send os en besked</h2>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <input type="hidden" name="sourcePage" value="Kontakt" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
              Fornavn *
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
              Efternavn *
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Telefon
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime focus:border-transparent"
              placeholder="+45 12 34 56 78"
            />
          </div>
        </div>

        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
            Virksomhed
          </label>
          <input
            type="text"
            id="company"
            name="company"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Besked *
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-lime focus:border-transparent"
            placeholder="Fortæl os hvordan vi kan hjælpe dig..."
          />
        </div>

        {status === 'success' && (
          <p className="text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
            {message}
          </p>
        )}
        {status === 'error' && (
          <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full bg-lime text-navy font-bold py-4 px-6 rounded-xl hover:scale-105 transition-transform disabled:opacity-70 disabled:hover:scale-100"
        >
          {status === 'submitting' ? 'Sender...' : 'Send besked'}
        </button>
      </form>
    </div>
  )
}
