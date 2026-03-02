import { createServerSupabaseClient } from '../../../../lib/supabase'
import type { Database } from '../../../../lib/database.types'

type BlogPost = Database['public']['Tables']['blog_posts']['Row']

export const BLOG_POSTS_PER_PAGE = 6

export type BlogPostListResult = {
  posts: BlogPost[]
  total: number
  hasMore: boolean
}

export async function getBlogPosts(page = 1): Promise<BlogPostListResult> {
  const supabase = createServerSupabaseClient()

  const currentPage = Math.max(page, 1)
  const from = (currentPage - 1) * BLOG_POSTS_PER_PAGE
  const to = from + BLOG_POSTS_PER_PAGE - 1

  const { data, error, count } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Kunne ikke hente blogindlæg', error)
    return { posts: [], total: 0, hasMore: false }
  }

  const posts = data ?? []
  const total = count ?? posts.length
  const hasMore = from + posts.length < total

  return { posts, total, hasMore }
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error(`Kunne ikke hente blogindlæg med slug ${slug}`, error)
    return null
  }

  return data
}
