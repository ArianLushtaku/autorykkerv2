import PageHero from '@/components/marketing/PageHero'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBlogPostBySlug, getBlogPosts } from '../queries'
import { ArrowLeft } from 'lucide-react'

type Props = {
  params: Promise<{ slug: string }>
}

function formatDate(dateString: string | null): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('da-DK', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

// Simple markdown-like rendering (basic support)
function renderContent(content: string) {
  const lines = content.split('\n')
  const elements: JSX.Element[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-2 mb-6 text-gray-600">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      )
      listItems = []
    }
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    
    if (trimmed.startsWith('## ')) {
      flushList()
      elements.push(
        <h2 key={index} className="text-2xl font-bold text-navy mt-8 mb-4">
          {trimmed.slice(3)}
        </h2>
      )
    } else if (trimmed.startsWith('### ')) {
      flushList()
      elements.push(
        <h3 key={index} className="text-xl font-bold text-navy mt-6 mb-3">
          {trimmed.slice(4)}
        </h3>
      )
    } else if (trimmed.startsWith('- **') || trimmed.startsWith('* **')) {
      inList = true
      // Handle bold list items
      const content = trimmed.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      listItems.push(content)
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true
      listItems.push(trimmed.slice(2))
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList()
      elements.push(
        <p key={index} className="text-gray-600 mb-2 pl-4">
          <span className="font-bold text-navy">{trimmed.split('.')[0]}.</span>
          {trimmed.slice(trimmed.indexOf('.') + 1).replace(/\*\*(.*?)\*\*/g, '<strong class="text-navy">$1</strong>')}
        </p>
      )
    } else if (trimmed === '') {
      flushList()
    } else {
      flushList()
      // Handle inline bold
      const html = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-navy">$1</strong>')
      elements.push(
        <p key={index} className="text-gray-600 mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
      )
    }
  })

  flushList()
  return elements
}

export async function generateStaticParams() {
  const { posts } = await getBlogPosts(1)
  return posts.map((post) => ({ slug: post.slug }))
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  return (
    <>
      <PageHero 
        title={post.title}
        subtitle={post.excerpt || ''}
      />
      <main>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Back link */}
          <Link 
            href="/blog" 
            className="inline-flex items-center text-navy hover:text-navy/70 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbage til blog
          </Link>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 mb-8 pb-8 border-b border-gray-200">
            {post.category && (
              <span className="bg-navy text-white px-3 py-1 rounded-full text-sm font-medium">
                {post.category}
              </span>
            )}
            <span className="text-gray-500 text-sm">
              {formatDate(post.published_at)}
            </span>
            {post.read_time_minutes && (
              <span className="text-gray-500 text-sm">
                {post.read_time_minutes} min læsning
              </span>
            )}
            {post.author_name && (
              <span className="text-gray-500 text-sm">
                Af {post.author_name}
              </span>
            )}
          </div>

          {/* Content */}
          <article className="prose prose-lg max-w-none">
            {renderContent(post.content)}
          </article>

          {/* CTA */}
          <div className="mt-16 bg-gray-50 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-navy mb-4">
              Klar til at optimere din debitorstyring?
            </h3>
            <p className="text-gray-600 mb-6">
              Prøv Autorykker gratis og se hvordan vi kan hjælpe din virksomhed.
            </p>
            <Link 
              href="/signup"
              className="inline-block bg-lime text-navy font-bold px-8 py-4 rounded-xl hover:scale-105 transition-transform"
            >
              Start gratis prøveperiode
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
