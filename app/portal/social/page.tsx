'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Upload, Loader, Trash2, Eye, EyeOff, Camera, Link2 } from 'lucide-react'

function InstagramIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

interface SocialPost {
  id: string
  type: 'image' | 'video' | 'instagram' | 'tiktok'
  media_url?: string
  embed_url?: string
  caption: string
  active: boolean
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  image: 'Photo',
  video: 'Video',
  instagram: 'Instagram',
  tiktok: 'TikTok',
}

export default function SocialPortalPage() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [embedCaption, setEmbedCaption] = useState('')
  const [tab, setTab] = useState<'upload' | 'embed'>('upload')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/social')
      const data = await res.json()
      // Also fetch inactive — use admin endpoint (reuse same route + active=false)
      const res2 = await fetch('/api/social?all=1')
      const data2 = await res2.json()
      setPosts(data2.posts ?? data.posts ?? [])
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPosts() }, [loadPosts])

  async function handleUpload(file: File) {
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    form.append('caption', caption)
    try {
      const res = await fetch('/api/portal/social/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (data.post) {
        setPosts(p => [data.post, ...p])
        setCaption('')
      } else {
        setError(data.error ?? 'Upload failed')
      }
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleEmbed() {
    if (!embedUrl.trim()) return
    setUploading(true)
    setError(null)
    try {
      const res = await fetch('/api/portal/social/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embed_url: embedUrl.trim(), caption: embedCaption }),
      })
      const data = await res.json()
      if (data.post) {
        setPosts(p => [data.post, ...p])
        setEmbedUrl('')
        setEmbedCaption('')
      } else {
        setError(data.error ?? 'Failed to add embed')
      }
    } catch {
      setError('Failed to add embed')
    } finally {
      setUploading(false)
    }
  }

  async function toggleActive(post: SocialPost) {
    await fetch('/api/social', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id, active: !post.active }),
    })
    setPosts(p => p.map(x => x.id === post.id ? { ...x, active: !x.active } : x))
  }

  async function deletePost(post: SocialPost) {
    if (!confirm('Delete this post?')) return
    await fetch('/api/social', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post.id }),
    })
    setPosts(p => p.filter(x => x.id !== post.id))
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-bark-600">Social Feed</h1>
        <p className="font-sans text-sm text-bark-400 mt-1">
          Manage the public social media page. Upload photos/videos or paste Instagram & TikTok post URLs.
        </p>
      </div>

      {/* Add new post */}
      <div className="bg-cream-50 border border-cream-300 rounded-xl p-6 mb-8">
        <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-bark-400 mb-4">Add New Post</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-cream-300">
          {(['upload', 'embed'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-sans text-xs tracking-[0.15em] uppercase transition-colors -mb-px border-b-2 ${
                tab === t ? 'border-bark-600 text-bark-600' : 'border-transparent text-bark-400 hover:text-bark-600'
              }`}
            >
              {t === 'upload' ? 'Upload Photo/Video' : 'Instagram / TikTok'}
            </button>
          ))}
        </div>

        {tab === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-cream-300 rounded-lg p-8 text-center cursor-pointer hover:border-bark-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const file = e.dataTransfer.files[0]
                if (file) handleUpload(file)
              }}
            >
              {uploading ? (
                <Loader size={24} className="text-bark-400 animate-spin mx-auto" />
              ) : (
                <>
                  <Upload size={24} className="text-bark-300 mx-auto mb-2" />
                  <p className="font-sans text-sm text-bark-400">Drop a photo or video here, or click to browse</p>
                  <p className="font-sans text-[10px] text-bark-400/60 mt-1">JPG, PNG, WebP, MP4, MOV, WebM</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleUpload(file)
                  e.target.value = ''
                }}
              />
            </div>
            <input
              type="text"
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="w-full border border-cream-300 px-4 py-2.5 font-sans text-sm text-bark-600 placeholder:text-bark-400/50 focus:outline-none focus:border-bark-400 bg-white"
            />
          </div>
        )}

        {tab === 'embed' && (
          <div className="space-y-4">
            <div className="flex gap-2 items-start">
              <Link2 size={16} className="text-bark-400 mt-3 shrink-0" />
              <div className="flex-1 space-y-3">
                <input
                  type="url"
                  value={embedUrl}
                  onChange={e => setEmbedUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/... or https://www.tiktok.com/@..."
                  className="w-full border border-cream-300 px-4 py-2.5 font-sans text-sm text-bark-600 placeholder:text-bark-400/50 focus:outline-none focus:border-bark-400 bg-white"
                />
                <input
                  type="text"
                  value={embedCaption}
                  onChange={e => setEmbedCaption(e.target.value)}
                  placeholder="Caption (optional)"
                  className="w-full border border-cream-300 px-4 py-2.5 font-sans text-sm text-bark-600 placeholder:text-bark-400/50 focus:outline-none focus:border-bark-400 bg-white"
                />
                <button
                  onClick={handleEmbed}
                  disabled={uploading || !embedUrl.trim()}
                  className="bg-bark-600 text-cream-50 font-sans text-[10px] tracking-[0.2em] uppercase px-6 py-3 hover:bg-bark-700 transition-colors disabled:opacity-40"
                >
                  {uploading ? 'Adding...' : 'Add Post'}
                </button>
              </div>
            </div>
            <p className="font-sans text-[10px] text-bark-400/60 pl-6">
              Paste any public Instagram post URL or TikTok video URL. The post will appear as a card linking back to the platform.
            </p>
          </div>
        )}

        {error && <p className="font-sans text-xs text-red-500 mt-3">{error}</p>}
      </div>

      {/* Posts grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader size={24} className="text-bark-400 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <Camera size={36} className="text-bark-200 mx-auto mb-3" />
          <p className="font-serif text-xl text-bark-400">No posts yet</p>
          <p className="font-sans text-sm text-bark-400/60 mt-1">Upload a photo or video above to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map(post => (
            <div key={post.id} className={`group relative bg-cream-100 rounded-xl overflow-hidden border ${post.active ? 'border-cream-300' : 'border-dashed border-cream-300 opacity-50'}`}>
              {/* Thumbnail */}
              <div className="relative aspect-square">
                {post.type === 'video' && post.media_url ? (
                  <video src={post.media_url} className="w-full h-full object-cover" muted playsInline />
                ) : post.type === 'image' && post.media_url ? (
                  <Image src={post.media_url} alt={post.caption} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                    {post.type === 'instagram'
                      ? <InstagramIcon size={32} />
                      : <span className="text-3xl">🎵</span>
                    }
                    <p className="font-sans text-[10px] text-bark-400 text-center line-clamp-2">{TYPE_LABEL[post.type]}</p>
                    {post.embed_url && (
                      <a href={post.embed_url} target="_blank" rel="noopener noreferrer" className="font-sans text-[9px] text-bark-400 underline">View post →</a>
                    )}
                  </div>
                )}

                {/* Type badge */}
                <div className="absolute top-2 left-2">
                  <span className="bg-black/50 text-white font-sans text-[8px] tracking-[0.1em] uppercase px-1.5 py-0.5 rounded">
                    {TYPE_LABEL[post.type]}
                  </span>
                </div>
              </div>

              {/* Caption */}
              {post.caption && (
                <div className="px-3 py-2">
                  <p className="font-sans text-[10px] text-bark-500 line-clamp-2">{post.caption}</p>
                </div>
              )}

              {/* Actions (hover) */}
              <div className="absolute inset-0 bg-bark-800/60 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => toggleActive(post)}
                  className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-bark-600 hover:bg-cream-100 transition-colors"
                  title={post.active ? 'Hide from feed' : 'Show in feed'}
                >
                  {post.active ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => deletePost(post)}
                  className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete post"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
