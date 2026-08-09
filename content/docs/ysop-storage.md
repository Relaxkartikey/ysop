---
title: YSOP Storage
order: 4
---

YSOP (Your Storages at One Place) lets you connect your own Cloudflare R2 bucket and use it through the same upload, folder, and link workflow as platform storage. This is a **Pro** feature.

## Connecting a bucket

1. Go to **Settings → Storage**.
2. Add your Cloudflare R2 account ID, access key ID, and secret access key.
3. YSOP tests the connection before saving it.

Your credentials are encrypted at rest and are never displayed back to you or exposed to the browser after you save them — not even to you. If you need to change them, disconnect the node and reconnect with new credentials.

Uploads go directly from your browser to your bucket, so your bucket also needs a CORS policy allowing YSOP's origin — see [Finding Your Cloudflare R2 Keys](/docs/finding-r2-keys#5-set-the-buckets-cors-policy) for the exact policy to add.

## Storage quota

Each connected bucket gets a configurable quota, defaulting to 9 GB. You can raise or lower it from the same settings page. YSOP enforces this quota server-side before accepting an upload to that node.

## Choosing storage per upload

When you have a bucket connected, the upload page lets you pick which storage to use for each file — your bucket, or YSOP's platform storage.

## Disconnecting

Disconnecting a bucket removes YSOP's stored credentials for it immediately. **YSOP never deletes files from your own bucket** — anything already uploaded there stays exactly where it is, under your control, even after you disconnect.
