---
title: Building and publishing courses
category: Content review
summary: How to create a course, write lessons, add videos and quiz questions, set the pass mark, and publish or unpublish, plus what members see and known gaps.
order: 50
keywords: courses admin, create course, edit course, lessons, sections, quiz, questions, answers, correct answer, pass mark, pass percent, publish, unpublish, draft, badge title, course certificate, youtube, vimeo, video lesson
pages: /admin/courses, /admin/courses/[id], /courses, /courses/[slug], /courses/[slug]/learn, /courses/[slug]/certificate
---

Courses are free guided lessons with quizzes. Members who pass every lesson get a certificate and a profile badge. Admins build them at /admin/courses. The member side is in [Courses](/help/courses) and [Course certificates](/help/course-certificates).

## Where do I manage courses?
Pick **Courses** in the admin side menu (subtitle "Lessons and quizzes"), or press the **Courses** card on the [Dashboard](/admin) ("Lessons, quizzes and drafts still to publish").

The badge and the "N waiting" pill count every course that isn't published (drafts). A draft you're still writing counts as waiting until you publish or delete it.

## What does the Courses list show?
The page has an **Admin hub** back link, the heading **Courses** and "Create and edit courses, lessons, and quizzes." Courses are listed in their sort order. Each row shows:

- The title and a **Published** (green) or **Draft** (amber) badge.
- "/slug · N lessons · ~N min".
- Three icons: a pencil (**Edit**), an eye (**Publish**) or crossed-out eye (**Unpublish**), and a trash can (**Delete**).

With no courses you see "No courses yet."

## How do I create a new course?
1. Press **New course**.
2. Fill in **Course title** (required), the URL slug (optional; leave it blank and it's made from the title, for example "Your First Tank" becomes your-first-tank) and **Badge title** (optional, for example "Certified New Tank Owner"; blank becomes "Certified").
3. Press **Create & edit**, or **Cancel**.

The course is created as a draft at the end of the list and you're taken to its editor. A missing title shows "A title is required." A slug another course already uses shows "That slug is already taken."

## What's in the Course details box?
On /admin/courses/[id] under **Edit course**:

- **Title**, **URL slug**, **Badge title** and **Estimated minutes** (a number; blank or 0 saves as 30).
- **Subtitle** and **Description** (the description is also used as the search engine description).
- **Cover image URL**: a web address for the cover image. There's no upload button here.
- **Published (visible to everyone)**: tick to publish.

Press **Save details**. "Saved" flashes for two seconds. A blank badge title saves as "Certified". Changing the slug to one in use shows "That slug is already taken."; an empty slug shows "Slug can't be empty."

Changing the slug changes the course's address. Old links to /courses/old-slug stop working.

## How do I add and edit lessons?
Lessons (called sections in the database) are listed under **Lessons**, numbered in order.

1. Press **Add lesson**. A lesson titled "New lesson" is added at the end and its editor opens.
2. Fill in **Lesson title** and **Lesson content (Markdown: \*\*bold\*\*, lists)**.
3. Optionally tick **This lesson has a video** (next section).
4. Press **Save lesson**, or **Cancel** to close without saving.

A blank title saves as "Untitled". Each lesson row shows a film icon if it has a video and "N quiz questions". Use the up and down arrows to reorder (saved immediately), the pencil to open or close the editor, and the trash can to delete (confirm: "Delete the lesson "[title]" and its quiz?").

With no lessons the editor shows "No lessons yet. Add the first one."

## How do lesson videos work?
Tick **This lesson has a video** and paste a link in **Video link**. A hint under the box tells you what it recognised:

- YouTube link (watch, youtu.be, shorts, live or embed): "YouTube link recognised. It will be converted to an embed automatically."
- Vimeo link: "Vimeo link recognised. It will be converted to an embed automatically."
- A direct file ending in .mp4, .webm, .ogv, .ogg, .mov or .m4v: "Direct video file. It will play in the built-in player."
- Any other address containing /embed/: "Embed URL. Used as-is."
- Empty: "Leave this empty to show the "coming soon" placeholder."
- Anything else (in amber): "This doesn't look like a video link. Paste a YouTube or Vimeo URL, or a direct .mp4 address."

When the link will be changed, a "Saved as" line shows the real address that will be stored, and a preview player appears. A ticked box with an empty link shows members a "Video lesson coming soon" placeholder.

## How do I write quiz questions?
Open a lesson with the pencil. The **Quiz** panel is under the lesson editor.

1. Press **Add question**. A question "New question" with answers "First answer" and "Second answer" is saved straight away and opens for editing.
2. Type the question in **Question**.
3. Fill in the answers (**Answer 1**, **Answer 2**...). Press **+ Add answer** for more. The X next to an answer removes it (only shown when there are more than two).
4. Tap the circle next to the right answer to mark it correct ("Tap the circle to set the correct answer").
5. Press **Save question**.

Closed questions show the prompt and "Correct: [answer]". Reorder with the arrows, edit with the pencil, delete with the trash can (confirm: "Delete this question?").

Errors you can see: "Enter a question.", "Add at least two answers.", "Every answer needs text.", "Mark the correct answer.", and from the server "The question can't be empty.", "Add at least two answers, each with text.", "Mark a valid correct answer." or "The correct answer must be one of the listed answers."

With no questions the panel says "No questions yet. A lesson needs at least one to gate progress." A lesson with no questions is passed just by reading it.

## How is a quiz graded, and what is the pass mark?
When a member submits a lesson's quiz, the server grades it against the hidden answer key. Their score is the percentage of questions right, rounded. If it's at least the course's pass mark, the lesson is marked done. Passing still tells them which questions they missed.

The pass mark is the course's pass percent, between 1 and 100. If it's not set it's 100, meaning every answer must be right.

**Known issue:** there is no pass mark field in the course editor. To lower it (for example to 80), edit the course's pass percent column in the courses table in Supabase.

## What happens when a member finishes a course?
When every lesson in the course is passed, the site records a course completion with a certificate code and, the first time only, gives the member the course completion bubbles. The member can then open their certificate at /courses/[slug]/certificate. Course certificates issued through the certificate registry belong to its Courses program (registry codes starting with C) and can be checked at [Verify](/verify). See [Society certificates admin](/admin/help/society-certificates-admin) for the registry.

Adding a lesson later doesn't take anything away from people who already finished. Members partway through will need the new lesson too.

## How do I publish or unpublish a course?
Either press the eye icon on the Courses list, or tick **Published (visible to everyone)** in the editor and press **Save details**. Published courses appear on [Courses](/courses) and can be taken. Unpublishing hides the course, its lessons and its certificate page (they show "not found"), and quizzes on it can't be graded ("Section not found.").

## How do I delete a course?
Press the trash can on the Courses list and confirm: "Delete "[title]"? This removes its lessons, quizzes, and everyone's completions. This can't be undone." Unpublish instead if you might want it back.

## Common problems
**Preview opens a "not found" page.** **Known issue:** the **Preview** link in the editor opens the public course page, which only shows published courses. Drafts can't be previewed. Publish it briefly, or check it with a test account right after publishing.

**The course list order is wrong.** **Known issue:** there's no control to reorder courses. New courses go to the end. Change the sort order column in the courses table in Supabase.

**A YouTube lesson shows an empty gray box.** Re-open the lesson and check the hint says the link was recognised, then save again. Some videos have embedding turned off by their owner.

**"Admins only." or "Not signed in." on save.** Your session expired or your admin flag isn't set.

**The Dashboard keeps counting a course.** Every unpublished course counts. Publish or delete old drafts to clear it.
