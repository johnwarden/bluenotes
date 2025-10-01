import {createSupportPageScreen} from '#/components/SupportPage'

// HTML content for the Copyright Policy
const supportPageHTML = `<section class="max-w-[918px] mx-auto px-4 pt-2 600:px-6 support-page">
<h4>Last Updated: October 1, 2025</h4>

<h2>Copyright Policy</h2>

<p>Bluenotes is a client application that provides access to content on the AT Protocol network. We respect intellectual property rights and comply with the Digital Millennium Copyright Act (DMCA).</p>

<h3>Content Hosting</h3>
<p>Bluenotes does not host, store, or control user content. All content is stored and managed by AT Protocol providers, primarily Bluesky Social, PBC.</p>

<h3>Copyright Complaints</h3>
<p>If you believe content accessible through Bluenotes infringes your copyright:</p>
<ol>
  <li><strong>Contact the content host directly:</strong> Submit your DMCA notice to Bluesky Social, PBC using their official process at <a href="https://bsky.social/about/support/copyright">https://bsky.social/about/support/copyright</a></li>
  <li><strong>For assistance:</strong> Contact us at <a href="mailto:copyright@bluenotes.social">copyright@bluenotes.social</a> and we'll provide guidance on directing your request to the appropriate provider</li>
</ol>

<h3>Our Role</h3>
<p>Bluenotes will:</p>
<ul>
  <li>Cooperate with valid legal requests</li>
  <li>Remove access to specific content in our client interface when legally required</li>
  <li>Provide guidance to help copyright holders contact the appropriate content hosts</li>
</ul>

<p>Please note: We cannot directly remove content from the AT Protocol network, and removal from Bluenotes does not guarantee removal from other AT Protocol clients.</p>

<h3>Counter-Notifications</h3>
<p>If you believe your content was wrongly removed due to a copyright complaint, you should submit a counter-notification directly to the AT Protocol provider that hosts your content, typically Bluesky Social, PBC.</p>

<h3>Repeat Infringers</h3>
<p>While Bluenotes does not directly manage user accounts (which are managed by AT Protocol providers), we will cooperate with content hosts' policies regarding repeat copyright infringers and may restrict access through our client when legally required.</p>

<h3>Legal Information</h3>
<p>This policy is governed by the laws of the State of Delaware. For legal notices and copyright-related inquiries, contact: <a href="mailto:copyright@bluenotes.social">copyright@bluenotes.social</a></p>

<h3>Contact Information</h3>
<p>For copyright-related matters:</p>
<address>
  <strong>Bluenotes Copyright Agent</strong><br>
  Email: <a href="mailto:copyright@bluenotes.social">copyright@bluenotes.social</a>
</address>

<p>For general inquiries about this policy, contact: <a href="mailto:support@bluenotes.social">support@bluenotes.social</a></p>
</section>`

export const CopyrightPolicyScreen = createSupportPageScreen(
  'Copyright Policy',
  supportPageHTML,
)
