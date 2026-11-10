# Changelog

## Unreleased

One page, as the organizers asked. The whole site is now the home page, in sections: About, Topics
of interest, Paper categories, Important dates, Submission, Policies, Program, Keynotes, Accepted
papers (once there are papers), Organization, Attend, Contact and Previous editions; news goes to
the RSS feed only. Each
section ends on "Go to top ↑", and the menu jumps to sections. About shows its first paragraph, and
Submission its key facts, with the rest behind "Read more". Text now fills the width of the screen,
up to about 90 characters a line. The old page addresses redirect to their sections. The Call for
Papers' banner photo is gone with its page (`cfpPhoto` is removed from `site.yaml`), and a checklist
step's `path` is now an anchor such as `/#dates`. The first edition, QuaLLM-KG 2026 at EDBT/ICDT
2026 in Tampere, Finland, is listed under Previous editions with a link to its site.

Less again, as the chairs asked. The home page goes from the banner straight to "About": the
two-line statement, the "Read the call for papers" button and the key facts are gone, and so is the
unused `exchange` field in `cfp.yaml`. The deadline bar under the header and the theme button are
gone; the site follows the system's light or dark theme, and a small script still keeps statuses and
the flagged date current between rebuilds. The Dates page lists the deadlines and the workshop's day
only, without the calendar and time-zone buttons or the EDBT/ICDT 2027 dates, and once the workshop
date is known the call and Attend give it alone ("Workshop date: 6 April 2027, in Lille, France.").
The footer reads "© DQ4AI 2027 — All rights reserved", as the previous edition's did. The contact
is soror.sahri@u-pariscite.fr.

The organization's root address, <https://dq4ai.github.io/>, can now send visitors to this edition
instead of showing GitHub's 404 page. The redirect pages are in `org-root/`, with the steps to
publish them from a `dq4ai/dq4ai.github.io` repository, which needs an owner of the organization. A
step in `docs/NEW_EDITION.md` moves the redirect each year.

The audit of the live site after each deploy uses the same budgets as CI, including the Call for
Papers' own phone budget, which it was missing.

The layout of the previous edition's site, as the organizers asked. The home banner reads, one line
each: "Second International Workshop on", "Data Quality for Artificial Intelligence (DQ4AI 2027),",
"co-located with EDBT/ICDT 2027, Lille, France" and "(April 6, 2027)". The home page shows the full
"About the DQ4AI Workshop" and every topic; topics are now a heading over bullet points, on the home
page and in the call, and `cfp.yaml` gives each topic `items` instead of one `description` (the
bullets keep the sentences' own words). The call shows the whole scope and lists paper categories as
one bullet each, with nothing to click open. Names are in red and affiliations in the text colour.
The footer is one line with the workshop's name and no menu; each page ends on "Go to top ↑". The
workshop is on 6 April 2027; paper submission closes 15 January 2027, notification is 20 February
and camera-ready papers are due 5 March, all AoE. Divesh Srivastava's affiliation is AT&T Labs
Research, Bedminster, NJ, USA.

A finished phone view. On a phone the Call for Papers opens on a photo card of the Grand'Place, the
belfry and the Vieille Bourse, with the title and lede on paper below it like every other page,
instead of a navy panel. The photo is a small 16:9 crop made at build time; as the page's largest
paint it takes about 1.95 s in Lighthouse's phone run, so this one page now has its own budget
(performance at least 0.99, largest paint under 2 s) while every other page keeps 100 and 1.2 s. The host city photo on Attend becomes a 3:2 crop on a phone rather than a sliver of the whole
panorama. Every label and value now stack the same way on a phone, on every page. A list that ends a
section no longer draws a second rule, the coffee break is set in the page's type, the topic tags
share rows, the footer links flow without splitting, the Submit button has room before the next
section, and both "to be announced" sentences in the call look alike. The photo credits now say the
photos are cropped as well as resized.

The home page opens with a soft banner, in the spirit of classic workshop sites: the title, the
edition and where it meets, centered over ribbons of colour. The ribbons are the logo's two
directions, navy flowing in from the left and teal from the right, meeting under the title, and drift
in once on arrival. They follow the theme, stay still with reduced motion, and are left off print.
The record no longer repeats where the workshop is. Home is back in the menu at every width.

Less at once, so a first visit invites rather than overwhelms. The home page opens with the two-way
statement and one button, a record of four facts (next deadline, workshop date, where, keynote), the
topics as tags, one paragraph on the goal, and the latest news in one line. Proceedings, communities,
the keynote section and the full scope now live one click away. The menu keeps five pages; Submission,
Keynotes and News move to the footer. The Call for Papers opens its scope on the goal with the rest
folded under "More on the scope", lists paper categories as titles that open onto their description,
and says the facts not yet known in one sentence instead of a row of "To be announced" each. The
unused `communities` field is gone from `cfp.yaml`.

Simpler and warmer, after the organizers' review. Serif type on a warm paper background, the topics
as a plain list of titles without icons, and a brighter photo behind the Call for Papers title. The
Call for Papers reads straight through: the links bar and the section on related venues are gone,
as is the matching section on the home page. The Organization page opens with the Honorary Chair and
lists each person on one line, "Name, Affiliation, Country", the name linking to their profile. The Program
Committee is now in alphabetical order of the names as they read, first name first.

The header now stays on screen while scrolling, so any page is one click away. The host city photo is
now the Grand'Place at dusk and links to a description of Lille, and the Call for Papers opens with a
panorama of the square behind its title.

New identity built around a logo and topic icons. The logo, a two-way loop around checked data, is in
the header and footer, and in the favicon and social images. The site's colors now come from it:
navy and teal, with amber kept for the next deadline. The home page opens with the logo and the eight
topics as icon tiles, each leading to its full description in the call for papers.

Motion and feedback: the home logo settles once on load, the phone menu fades open, and controls
respond to hover and press. A theme switch now changes everything at once, section links jump instead
of scrolling for over a second, and all of it respects the reduced motion setting.

Fixed after a review of how visitors use the site. Organization and Attend now say how to contact
the organizers, or that a contact is coming. A closed deadline stops being "next" as soon as it
closes, on every page, the submit button goes with it, and the daily rebuild now runs just after an
AoE day ends. The phone menu button stays where it is, says "Close" when open, closes when tapping
elsewhere, offers Home, and still works if scripts fail to load. The paper template can be a link.
Inner pages say what the event is. Times in another time zone name the day when it differs, and the
choice carries across pages. Rows and tables share one edge, printed programs keep their abstracts,
calendar entries name the workshop, and pages hold up with a very large browser font. Late fonts no
longer move the page. Terms are the same across pages.

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
