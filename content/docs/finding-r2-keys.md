---
title: Finding Your Cloudflare R2 Keys
order: 5
---

To connect your own Cloudflare R2 bucket to YSOP, you need three values: your Cloudflare **account ID**, an R2 **access key ID**, and an R2 **secret access key**. Here's how to find each one.

## 1. Create or choose a bucket

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Go to **R2 Object Storage** in the left sidebar.
3. Select an existing bucket, or click **Create bucket** to make a new one. See Cloudflare's [Get started with R2](https://developers.cloudflare.com/r2/get-started/) guide for details.

## 2. Find your account ID

1. From the R2 Object Storage overview page, your **Account ID** is shown in the right-hand panel.
2. You can also find it on any zone's **Overview** page in the dashboard, or by following Cloudflare's [Find your account ID](https://developers.cloudflare.com/fundamentals/setup/find-account-and-zone-ids/) guide.

## 3. Create an R2 API token

1. From the R2 Object Storage page, click **Manage R2 API Tokens** (or go to **R2 → Overview → API → Manage API tokens**).
2. Click **Create API token**.
3. Give the token a name, and set **Permissions** to **Object Read & Write** (scoped to the bucket you want to connect, if possible).
4. Click **Create API Token**.

Full reference: Cloudflare's [Authentication → API tokens](https://developers.cloudflare.com/r2/api/tokens/) guide.

## 4. Copy your access key ID and secret access key

After creating the token, Cloudflare shows the **Access Key ID** and **Secret Access Key** exactly once. Copy both immediately — the secret access key cannot be viewed again after you leave the page. If you lose it, delete the token and create a new one.

## 5. Add the keys to YSOP

1. Go to **Settings → Storage** in YSOP.
2. Enter your account ID, access key ID, and secret access key.
3. YSOP tests the connection before saving it.

See [YSOP Storage](/docs/ysop-storage) for how storage quotas and per-upload storage selection work once your bucket is connected.

## Related Cloudflare docs

- [R2 Object Storage overview](https://developers.cloudflare.com/r2/)
- [Get started with R2](https://developers.cloudflare.com/r2/get-started/)
- [Authentication and API tokens](https://developers.cloudflare.com/r2/api/tokens/)
- [S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
