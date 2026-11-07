# Changelog

## Unreleased

Redesigned as a data record. Every page now shares one layout, with section names in a left column
and facts set as rows of label and value. Values not yet known appear as quiet empty cells, the next
deadline is the one flagged cell, and the home page opens with what is known. Removed the color band
on every page, the circles diagram, the pills and the topic numbers. New wordmark, favicon and social
images. Fixed screen readers hearing each heading twice, and scrolling tables that the keyboard could
not reach.

Fixed after review of the redesign: an extended deadline now says so even when it is not the next
one, the navigation stays visible on small laptops, long links no longer make phone pages scroll
sideways, and a keynote speaker not yet known no longer appears as a raw "TBA". Unknown values now
read "To be announced" everywhere, or "Not recorded" for a past edition. Section titles can be
selected again, with their link beside them rather than around them. The footer offers the calendar
only once deadlines have dates, empty home page sections are left out, the dates table fits phones,
printed pages use document sizes, and the home page's statement is its own field in `cfp.yaml`.

Added a photo of Lille to the Attend page, with its credit and a note that it shows the host city,
not the workshop venue. The build now fails if such a photo lacks its author, license or source.

Redesigned around the workshop's purpose: the home page now leads with the two-way relationship
between data quality and AI, with a diagram, the communities involved and full topic descriptions,
under a new color identity.

Added a collaboration guide and a structured content request form.

Clearer for visitors: the home page no longer offers a submission link that does not exist yet,
conference dates are kept apart from the workshop date, unknown details are listed once, extended
deadlines say which date is current, and page limits and policies are easier to find. Search results
now name the workshop and its host. Also fixed the mobile menu's keyboard order, the deadline bar
covering headings on phones, and the theme not following across tabs or the Back button.

The host conference's dates can no longer be misread as the workshop's in structured data or the
deadlines calendar, and the home social image no longer repeats its title.

## 1.0.0 (2026-11-06)

First release of the DQ4AI 2027 website: all pages, validated content, calendar files, plain-text
CFP, RSS, social images, and automated checks and deployment.
