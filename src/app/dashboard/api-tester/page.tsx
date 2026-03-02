'use client';

import { useState } from 'react';
import { Loader2, Send, Copy, Check } from 'lucide-react';

export default function ApiTesterPage() {
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState('/v1/{organizationId}/webhooks/events');
  const [params, setParams] = useState('');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const exampleEndpoints = [
    { label: 'Webhooks Events', value: '/v1/{organizationId}/webhooks/events' },
    { label: 'Contacts', value: '/v1/{organizationId}/contacts' },
    { label: 'Invoices', value: '/v1/{organizationId}/invoices' },
    { label: 'Products', value: '/v1/{organizationId}/products' },
    { label: 'Accounts', value: '/v1/{organizationId}/accounts' },
  ];

  const handleTest = async () => {
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      let parsedParams = {};
      let parsedBody = {};

      if (params.trim()) {
        try {
          parsedParams = JSON.parse(params);
        } catch (e) {
          throw new Error('Invalid JSON in params field');
        }
      }

      if (body.trim() && (method === 'POST' || method === 'PUT')) {
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          throw new Error('Invalid JSON in body field');
        }
      }

      const res = await fetch('/api/dinero/test-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          endpoint,
          params: parsedParams,
          body: parsedBody,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setResponse(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.body, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white mb-2">Dinero API Tester</h1>
        <p className="text-gray-600 dark:text-gray-400">Test any Dinero API endpoint without writing code</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request Panel */}
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">Request</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Configure your API request</p>
          </div>

          <div className="space-y-4">
            {/* Method */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                HTTP Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            {/* Endpoint */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Endpoint
              </label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="/v1/{organizationId}/..."
                className="w-full rounded border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {exampleEndpoints.map((ex) => (
                  <button
                    key={ex.value}
                    onClick={() => setEndpoint(ex.value)}
                    className="rounded border border-stroke px-3 py-1 text-xs hover:bg-gray-100 dark:border-strokedark dark:hover:bg-meta-4"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Query Params */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Query Parameters (JSON)
              </label>
              <textarea
                value={params}
                onChange={(e) => setParams(e.target.value)}
                placeholder='{"page": 0, "pageSize": 10}'
                rows={3}
                className="w-full rounded border border-stroke bg-transparent px-4 py-3 font-mono text-sm text-dark outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white"
              />
            </div>

            {/* Request Body */}
            {(method === 'POST' || method === 'PUT') && (
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Request Body (JSON)
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={5}
                  className="w-full rounded border border-stroke bg-transparent px-4 py-3 font-mono text-sm text-dark outline-none focus:border-primary dark:border-strokedark dark:bg-form-input dark:text-white"
                />
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleTest}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded bg-primary px-6 py-3 font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Request
                </>
              )}
            </button>

            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Response Panel */}
        <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">Response</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">API response details</p>
            </div>
            {response && (
              <button
                onClick={copyResponse}
                className="flex items-center gap-2 rounded border border-stroke px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-strokedark dark:hover:bg-meta-4"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>

          {!response && !error && (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              Send a request to see the response
            </div>
          )}

          {response && (
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Status Code
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      response.status_code >= 200 && response.status_code < 300
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    {response.status_code}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{response.method}</span>
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  URL
                </label>
                <div className="break-all rounded bg-gray-100 p-2 font-mono text-xs dark:bg-meta-4">
                  {response.url}
                </div>
              </div>

              {/* Response Body */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Response Body
                </label>
                <div className="max-h-96 overflow-auto rounded bg-gray-100 p-3 dark:bg-meta-4">
                  <pre className="font-mono text-xs">
                    {JSON.stringify(response.body, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Headers */}
              <details className="space-y-2">
                <summary className="cursor-pointer text-sm font-medium">
                  Response Headers
                </summary>
                <div className="mt-2 max-h-48 overflow-auto rounded bg-gray-100 p-3 dark:bg-meta-4">
                  <pre className="font-mono text-xs">
                    {JSON.stringify(response.headers, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Quick Examples */}
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">Quick Examples</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Common API requests to get you started</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 rounded-lg border border-stroke p-4 dark:border-strokedark">
            <h4 className="font-medium">List Webhooks</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Get available webhook events</p>
            <code className="block rounded bg-gray-100 p-1 text-xs dark:bg-meta-4">GET /webhooks/events</code>
          </div>
          <div className="space-y-2 rounded-lg border border-stroke p-4 dark:border-strokedark">
            <h4 className="font-medium">List Contacts</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Get first 10 contacts</p>
            <code className="block rounded bg-gray-100 p-1 text-xs dark:bg-meta-4">GET /contacts?pageSize=10</code>
          </div>
          <div className="space-y-2 rounded-lg border border-stroke p-4 dark:border-strokedark">
            <h4 className="font-medium">List Invoices</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Get recent invoices</p>
            <code className="block rounded bg-gray-100 p-1 text-xs dark:bg-meta-4">GET /invoices?pageSize=5</code>
          </div>
        </div>
      </div>
    </div>
  );
}
