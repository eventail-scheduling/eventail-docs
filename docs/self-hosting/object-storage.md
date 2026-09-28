# Object storage

Eventail keeps uploads in a bucket: session teaser images, host avatars and files people attach
as answers to custom fields. Eventail works with an S3-compatible object store, such as AWS S3,
MinIO or RustFS, that supports bucket policies and uploads by presigned POST request. Not every
S3-compatible store does.

**Give Eventail a bucket of its own.** The file pruner deletes every object in the bucket that
this installation does not refer to, so anything else stored there is deleted too, including
another Eventail installation's uploads.

Browsers upload straight to the bucket and load images straight from it, so the bucket needs
2 things besides credentials: a CORS rule for uploads, and a policy that makes images public.

## Settings

The settings below are shown as the API's environment variables. In the Helm chart they are
the `s3` values, which `helm show values` lists.
[Configuration](/reference/configuration/#s3) lists the rest, such as request timeouts.

| Setting                                                                          | Meaning                                                                                                             |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `S3_BUCKET_NAME`                                                                 | The bucket's name.                                                                                                  |
| `S3_CLIENT_ENDPOINT`                                                             | The store's URL, such as `https://s3.example.com`.                                                                  |
| `S3_CLIENT_REGION`                                                               | The bucket's region. Stores without regions need a value too; `us-east-1` works.                                    |
| `S3_CLIENT_FORCE_PATH_STYLE`                                                     | `true` to address the bucket as a path on the endpoint rather than as a subdomain. Most self-hosted stores need it. |
| `S3_CLIENT_CREDENTIALS_ACCESS_KEY_ID`, `S3_CLIENT_CREDENTIALS_SECRET_ACCESS_KEY` | The access key. Leave both unset to use the AWS default credential chain.                                           |
| `S3_PUBLIC_BASE_URL`                                                             | The public URL of the bucket, which image URLs are built from.                                                      |
| `S3_MAX_FILE_SIZE`                                                               | The largest upload accepted, such as `10mb`.                                                                        |

`S3_PUBLIC_BASE_URL` is any URL that serves the bucket's objects under their keys. Usually that
is the endpoint plus the bucket, such as `https://s3.example.com/eventail`, or the bucket's own
host, such as `https://eventail.s3.example.com`. A CDN in front of the bucket works too; point
the setting at it.

The access key needs `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject` on the bucket's
objects, and `s3:ListBucket` on the bucket.

## Public images

Teaser images and avatars are shown to anyone, including visitors of your schedule, and must be
readable without credentials. Eventail sets no per-object permissions, which leaves a bucket
policy as the only way to make them readable. Open these 2 key patterns and nothing else:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicImages",
            "Effect": "Allow",
            "Principal": "*",
            "Action": ["s3:GetObject"],
            "Resource": [
                "arn:aws:s3:::BUCKET/*/sessions/*/teaser-image/*",
                "arn:aws:s3:::BUCKET/*/hosts/*/avatar/*"
            ]
        }
    ]
}
```

Replace `BUCKET` with the bucket's name, save it as `policy.json`, and apply it with the AWS
CLI, pointed at your store with `--endpoint-url` if it is not AWS:

```sh
aws s3api put-bucket-policy --bucket BUCKET --policy file://policy.json
```

On AWS, Block Public Access rejects this policy while `BlockPublicPolicy` is on, and blocks
anonymous reads while `RestrictPublicBuckets` is on. Turn both off for the bucket, and for the
account or organization if they are set there, since the strictest setting wins.

Everything else stays private: files attached to custom fields, and uploads not yet attached to
anything. Eventail hands out custom-field files through signed links valid for 5 minutes.

Stores differ in how they match the wildcards in the middle of a path. After applying the
policy, upload an avatar and open its URL in a private browser window; then check that a file
attached to a custom field is not reachable at the same kind of address.

## Uploads from the browser

The web app uploads with a presigned POST request to the store, so the bucket needs a CORS rule
allowing that from the web app's origin:

```json
{
    "CORSRules": [
        {
            "AllowedOrigins": ["https://eventail.example.com"],
            "AllowedMethods": ["POST"],
            "AllowedHeaders": ["*"]
        }
    ]
}
```

Replace the origin with your `WEB_URL`, save the rule as `cors.json` and apply it:

```sh
aws s3api put-bucket-cors --bucket BUCKET --cors-configuration file://cors.json
```

Without the rule, uploads fail in the browser while everything on the server side keeps
working. `POST` is the only method needed: displaying an image in a page is not subject to
CORS.

## Caching

No object changes after it is written: attaching an upload copies it to a new key, and processed
images get keys of their own. Eventail marks teaser images, avatars and custom-field
files immutable, so a CDN needs no invalidation:

- Teaser images and avatars: `Cache-Control: public, max-age=31536000, immutable`
- Custom-field files: `Cache-Control: private, max-age=31536000, immutable`

## Cleanup

A background task, the file pruner, deletes objects that nothing refers to anymore, such as the
previous avatar once a new one replaces it. It runs every `WORKER_FILE_PRUNER_INTERVAL` (24 hours
by default). The first run that finds an unreferenced object records it. A later run deletes it
once `WORKER_FILE_PRUNER_MINIMUM_AGE` (24 hours by default) has passed since then. An upload that
was never attached is deleted by the first run after it reaches that age.

Both settings are ISO 8601 durations, explained at the top of
[Configuration](/reference/configuration/).
