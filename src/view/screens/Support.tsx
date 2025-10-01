import {createSupportPageScreen} from '#/components/SupportPage'

// HTML content for the Support
const supportPageHTML = `<section class="max-w-[918px] mx-auto px-4 pt-2 600:px-6 support-page">

<p>
  Bluenotes is a fork of Bluesky. If you need help, try looking in the <a href="https://blueskyweb.zendesk.com/hc/en-us">Bluesky Help Pages</a>.
</p>

<p>
  If you can't find a solution there, email us at<!-- --> <a href="mailto:support@bluenotes.social">support@bluenotes.social</a> with a description of your issue and information about how we can help you.
</p>

<ul>

  <li>
    <a href="/about/support/community-guidelines">Community Guidelines</a>
  </li>

  <li>
    <a href="/about/support/tos">Terms of Service</a>
  </li>

  <li>
    <a href="/about/support/tos-gov">Terms of Service Amendment for Government Users</a>
  </li>

  <li>
    <a href="/about/support/privacy-policy">Bluenotes App Privacy Policy</a>
  </li>

  <li>
    <a href="https://bsky.social/about/support/network-services-privacy-policy">Bluesky AT Protocol Network Services Privacy Policy</a>
  </li>

  <li>
    <a href="/about/support/copyright">Copyright Policy</a>
  </li>

</ul>

</section>`

export const SupportScreen = createSupportPageScreen('Support', supportPageHTML)
