import PageHero from '@/components/marketing/PageHero'
import Link from 'next/link'
import { getBlogPosts } from './queries'

function formatDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('da-DK', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

export default async function BlogPage() {
  const { posts } = await getBlogPosts(1)

  return (
    <>
      <PageHero 
        title="Blog"
        subtitle="Tips, guides og indsigter om debitorstyring, automatisering og forretningsoptimering."
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 text-lg">Ingen blogindlæg endnu. Kom tilbage snart!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {posts.map((post) => (
                <article key={post.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      {post.category && (
                        <span className="bg-navy text-white px-3 py-1 rounded-full text-sm font-medium">
                          {post.category}
                        </span>
                      )}
                      {post.read_time_minutes && (
                        <span className="text-gray-500 text-sm">{post.read_time_minutes} min læsning</span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-navy mb-3 hover:text-lime transition-colors">
                      <Link href={`/blog/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h2>
                    <p className="text-gray-600 mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">{formatDate(post.published_at)}</span>
                      <Link 
                        href={`/blog/${post.slug}`}
                        className="text-navy font-medium hover:text-navy/70 transition-colors"
                      >
                        Læs mere →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
