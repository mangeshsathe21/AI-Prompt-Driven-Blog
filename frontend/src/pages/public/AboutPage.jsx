import { Helmet } from '@vuer-ai/react-helmet-async'
import { Link } from 'react-router-dom'

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About — GreenTalk</title>
        <meta name="description" content="Learn about the GreenTalk community platform." />
      </Helmet>
      <div className="container py-12 max-w-3xl">
        <h1 className="text-4xl font-bold text-[var(--color-brand-dark)] mb-6">About GreenTalk</h1>
        <div className="prose max-w-none">
          <p>
            GreenTalk is an open-source community platform for plant lovers, home gardeners,
            and ecological restoration enthusiasts across India.
          </p>
          <h2>Our Mission</h2>
          <p>
            To connect people who care about green spaces — from balcony herb gardens to large-scale
            native tree plantations on barren land — through shared knowledge, plant exchanges,
            and a growing marketplace.
          </p>
          <h2>What you can do</h2>
          <ul>
            <li>Read and write articles in four categories: Home Gardening, Open Land Plantation, Land Restoration, and Plant Care Guides.</li>
            <li>Exchange plants for free or swap with nearby community members.</li>
            <li>Buy and sell plants, seeds, and gardening supplies in the marketplace.</li>
            <li>Explore our reference catalog of native and common Indian plants.</li>
          </ul>
          <h2>Open Source</h2>
          <p>
            GreenTalk is 100% open source (MIT license). Built with Django, React, and PostgreSQL —
            no paid services required.
          </p>
        </div>
        <div className="mt-8 flex gap-4">
          <Link to="/register" className="btn btn-primary">Join us</Link>
          <Link to="/blog" className="btn btn-ghost">Browse posts</Link>
        </div>
      </div>
    </>
  )
}
