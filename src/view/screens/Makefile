# Makefile for generating support page TypeScript files from HTML content
# Usage: make TermsOfService.tsx, PrivacyPolicy.tsx, etc.

.PHONY: SUPPORT_PAGES
SUPPORT_PAGES: PrivacyPolicy.tsx TermsOfService.tsx GovernmentTermsOfService.tsx CommunityGuidelines.tsx

bsky-PrivacyPolicy.html:
	curl --get https://bsky.social/about/support/privacy-policy > $@

bsky-TermsOfService.html:
	curl --get https://bsky.social/about/support/tos > $@

bsky-GovernmentTermsOfService.html:
	curl --get https://bsky.social/about/support/tos-gov > $@

bsky-CommunityGuidelines.html:
	curl --get https://bsky.social/about/support/community-guidelines > $@

#bsky-Support.html:
#	curl --get https://bsky.social/about/support > $@

bluenotes-%.html: bsky-%.html
	npx tsx ../../../scripts/modify-support-page.ts $< $@

# Mark bluenotes HTML files as precious so Make doesn't auto-delete them
.PRECIOUS: bluenotes-%.html

# Pattern rule: %.tsx depends on bluenotes-%.html
%.tsx: bluenotes-%.html SupportPageTemplate.tsx.template
	@echo "Generating $@ from $<..."
	@cd ../../../ && npx tsx scripts/generate-support-page.ts $(basename $@)


.PHONY: clean
clean: 
	rm *.html
