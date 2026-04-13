"""
Generate VAPID Keys for Web Push Notifications

Run this script once to generate your VAPID keys:
    python generate_vapid_keys.py

Then add the output to your .env file:
    VAPID_PUBLIC_KEY=<generated public key>
    VAPID_PRIVATE_KEY=<generated private key>
    VAPID_SUBJECT=mailto:your-email@example.com
"""

import base64
from ecdsa import SigningKey, NIST256p

sk = SigningKey.generate(curve=NIST256p)
vk = sk.verifying_key

private_key = base64.urlsafe_b64encode(sk.to_string()).rstrip(b'=').decode()
public_key = base64.urlsafe_b64encode(vk.to_string()).rstrip(b'=').decode()

print("=" * 60)
print("VAPID Keys Generated!")
print("=" * 60)
print()
print("Add these to your .env file:")
print()
print(f"VAPID_PUBLIC_KEY={public_key}")
print(f"VAPID_PRIVATE_KEY={private_key}")
print(f"VAPID_SUBJECT=mailto:admin@arxcs.com")
print()
print("=" * 60)
print("VAPID Keys Generated!")
print("=" * 60)
print()
print("Add these to your .env file:")
print()
print(f"VAPID_PUBLIC_KEY={public_key_str}")
print(f"VAPID_PRIVATE_KEY={private_key_str}")
print(f"VAPID_SUBJECT=mailto:admin@arxcs.com")
print()
print("=" * 60)
