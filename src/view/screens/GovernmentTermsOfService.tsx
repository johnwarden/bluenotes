import {createSupportPageScreen} from '#/components/SupportPage'

// HTML content for the Government Terms Of Service
const supportPageHTML = `<section class="max-w-[918px] mx-auto px-4 pt-2 600:px-6 support-page"><h4>
  Last Updated: March 12, 2025
</h4>

<p>
  Welcome to Bluenotes! This addendum modifies our Terms of Service specifically for users creating accounts on behalf of federal, provincial, state, or local government entities or officials for official governmental purposes. While this amendment currently applies only to U.S. and Canadian government users, we invite government entities or officials outside these countries who face Terms compatibility issues with their local laws to reach out to us at legal@bluenotes.social.
</p>

<br/>

<h3>
  Bluenotes Government Addenda
</h3>

<ul>

  <li>
    <a href="#us">United States</a>
  </li>

  <li>
    <a href="#ca">Canada</a>
  </li>

  <li>
    <a href="#nz">New Zealand</a>
  </li>

</ul>

<br/>

<br/>

<h3 id="us">
  Bluenotes Government Addendum (United States)
</h3>

<p>
  This Addendum to the Bluenotes Terms of Service applies to use of Bluenotes Social by or on behalf of any federal, state or local government entity or official located in the United States for official governmental purposes. If you are such a government user, then this Addendum amends the Terms as they apply to your official governmental use, but only to the extent the unamended Terms are incompatible with applicable laws.
</p>

<br/>

<ol>

  <li id="governing-law-us">
    <strong>Governing Law, Forum Choice and Dispute Resolution</strong>.
  </li>

  <ul>

    <p>
      If you are legally prohibited from agreeing to the governing law, forum choice, or mandatory arbitration provisions of the Terms by applicable law, then those clauses do not apply to you. For United States federal government users, the Terms and any action related thereto will be governed by the laws of the United States of America, without regard to conflict of laws provisions.
    </p>

  </ul>

  <li id="indemnification-liability-us">
    <strong>Indemnification, Liability, Conduct of Defense</strong>.
  </li>

  <ul>

    <p>
      Any indemnification provisions in the Terms do not apply to your official governmental use of Bluenotes Social unless expressly authorized under applicable law. Any provision in the Terms providing for the regulation and conduct of litigation are subject to any legislative requirements which apply to your official government use of Bluenotes social.
    </p>

  </ul>

  <li id="#liability-statutes-us">
    <strong>Liability and Statutes of Limitations</strong>.
  </li>

  <ul>

    <p>
      Liability for any breach of the Terms by a United States federal government user related to their official governmental use of Bluenotes Social shall be determined under the Federal Tort Claims Act, or other governing authority, and federal statute of limitations provisions shall apply.
    </p>

  </ul>

  <li id="#no-endorsement-us">
    <strong>No endorsement</strong>.
  </li>

  <ul>

    <p>
      Bluenotes will not use your seals, trademarks, logos, service marks, or trade names, or the fact that you have a presence on Bluenotes Social or use Bluenotes Social, to state or imply that you endorse, sponsor, or recommend Bluenotes Social.
    </p>

  </ul>

  <li id="#general-terms-us">
    <strong>General Terms</strong>.
  </li>

  <ul>

    <p>
      Any language in the Terms stating that the Terms are the entire agreement between us are waived. If there is any conflict between the Terms and this Addendum, then the terms of this Addendum control. For purposes of the Terms, “you” and “your” refer to the government entity itself and do not apply to the individuals in their personal capacity who use Bluenotes Social on that entity’s behalf in their official capacity. If applicable law requires Bluenotes to provide you with advanced notice of changes to the Terms, then Bluenotes will use commercially reasonable efforts to provide you with at least three days advance notice of any material change.
    </p>

  </ul>

</ol>

<br/>

<br/>

<h3 id="ca">
  Bluenotes Government Addendum (Canada)
</h3>

<p>
  This Addendum to the Bluenotes Terms of Service applies to use of Bluenotes Social by or on behalf of any federal, provincial or local government entity or official located in Canada for official governmental purposes. If you are such a government user, then this Addendum amends the Terms as they apply to your official governmental use, but only to the extent the unamended Terms are incompatible with applicable laws.
</p>

<br/>

<ol>

  <li id="governing-law-ca">
    <strong>Governing Law, Forum Choice and Dispute Resolution</strong>.
  </li>

  <ul>

    <p>
      If you are legally prohibited from agreeing to the governing law, forum choice, or mandatory arbitration provisions of the Terms by applicable law, then those clauses do not apply to you. In which case, the Terms and any action related thereto will be governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict of laws provisions.
    </p>

  </ul>

  <li id="indemnification-liability-ca">
    <strong>Indemnification and Liability</strong>.
  </li>

  <ul>

    <p>
      Any indemnification provisions in the Terms do not apply to your official governmental use of Bluenotes Social unless expressly authorized under applicable law. Any provision in the Terms providing for the regulation and conduct of litigation are subject to any legislative requirements which apply to your official government use of Bluenotes social.
    </p>

  </ul>

  <li id="no-endorsement-ca">
    <strong>No Endorsement</strong>.
  </li>

  <ul>

    <p>
      Bluenotes will not use your seals, trademarks, logos, service marks, or trade names, or the fact that you have a presence on Bluenotes Social or use Bluenotes Social, to state or imply that you endorse, sponsor, or recommend Bluenotes Social.
    </p>

  </ul>

  <li id="#general-terms-ca">
    <strong>General Terms</strong>.
  </li>

  <ul>

    <p>
      Any language in the Terms stating that the Terms are the entire agreement between us are waived. If there is any conflict between the Terms and this Addendum, then the terms of this Addendum control. For purposes of the Terms, “you” and “your” refer to the government entity itself and do not apply to the individuals in their personal capacity who use Bluenotes Social on that entity’s behalf in their official capacity. If applicable law requires Bluenotes to provide you with advanced notice of changes to the Terms, then Bluenotes will use commercially reasonable efforts to provide you with at least three days advance notice of any material change.
    </p>

  </ul>

</ol>

<br/>

<br/>

<h3 id="nz">
  Bluenotes Government Addendum (New Zealand)
</h3>

<p>
  This Addendum to the Bluenotes Terms of Service applies to use of Bluenotes Social by or on behalf of any federal, state or local government entity or official located in New Zealand for official governmental purposes. If you are such a government user, then this Addendum amends the Terms as they apply to your official governmental use, but only to the extent the unamended Terms are incompatible with applicable laws.
</p>

<br/>

<ol>

  <li id="governing-law-nz">
    <strong>Governing Law, Forum Choice and Dispute Resolution</strong>.
  </li>

  <ul>

    <p>
      If you are legally prohibited from agreeing to the governing law, forum choice, or mandatory arbitration provisions of the Terms by applicable law, then those clauses do not apply to you. For New Zealand government users, the Terms and any action related thereto will be governed by the laws of New Zealand, without regard to conflict of laws provisions.
    </p>

  </ul>

  <li id="indemnification-liability-nz">
    <strong>Indemnification, Liability, Conduct of Defense</strong>.
  </li>

  <ul>

    <p>
      Any indemnification provisions in the Terms do not apply to your official governmental use of Bluenotes Social unless they are specifically permitted by the laws of New Zealand. Any provision in the Terms providing for the regulation and conduct of litigation are subject to any legislative requirements which apply to your official government use of Bluenotes social.
    </p>

  </ul>

  <li id="no-endorsement-nz">
    <strong>No Endorsement</strong>.
  </li>

  <ul>

    <p>
      Bluenotes will not use your seals, trademarks, logos, service marks, or trade names, or the fact that you have a presence on Bluenotes Social or use Bluenotes Social, to state or imply that you endorse, sponsor, or recommend Blusky Social.
    </p>

  </ul>

  <li id="#general-terms-nz">
    <strong>General Terms</strong>.
  </li>

  <ul>

    <p>
      Any language in the Terms stating that the Terms are the entire agreement between us are waived. If there is any conflict between the Terms and this Addendum, then the terms of this Addendum control. For purposes of the Terms, “you” and “your” refer to the government entity itself and do not apply to the individuals in their personal capacity who use Bluenotes Social on that entity’s behalf in their official capacity. If applicable law requires Bluenotes to provide you with advanced notice of changes to the Terms, then Bluenotes will use commercially reasonable efforts to provide you with at least three days advance notice of any material change.
    </p>

  </ul>

</ol></section>`

export const GovernmentTermsOfServiceScreen = createSupportPageScreen(
  'Government Terms Of Service',
  supportPageHTML,
)
