Title: Chat: unify duplicate threads by user, merged history, attachment support

Status: closed

Summary
- Deduplicated chat list by other participant so the same user shows once.
- Merged message history across all threads with the same participant, ordered chronologically.
- New messages automatically send to the most recent thread with that user.
- Implemented attachment flow:
  - Image/GIF/file picker uploads to Cloudinary and inserts the URL into the compose box.
  - Message renderer already previews images/GIFs by URL.
- Removed call buttons from header (phone/video).

Files touched
- `src/pages/ChatInbox.tsx`: add deduping, merged subscriptions, upload handlers, hidden inputs, removed call buttons.

How to use
1) Open a conversation; history is unified.
2) Click the paperclip for files or the image icon/GIF label for images/GIFs; after upload, the URL is added to the input. Press send.

Notes
- Uploads use `src/lib/cloudinary.ts`. Set `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` in env for production.


