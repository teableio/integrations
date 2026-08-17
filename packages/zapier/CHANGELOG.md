# Changelog

## 1.1.0

Fixes the **Base** dropdown, which had started coming back empty and made it
impossible to set up a new Zap.

**Please reconnect your Teable account.** Teable tightened how permissions are
granted to connected apps, and connections made before this release are missing
the permission needed to list your bases. Reconnecting takes a few seconds, and
your existing Zaps keep running in the meantime — only setting up or editing a
Zap was affected.

1. Fix the empty Base dropdown in trigger/new_record and trigger/new_or_updated_record
2. Fix the empty Base dropdown in create/create_record, create/update_record, create/create_or_update_record and create/delete_record
3. Fix the empty Base dropdown in search/find_record and search/find_record_by_id
4. Update the Base dropdown to ask you to reconnect when the connection lacks permission, instead of showing an empty list with no explanation

## 1.0.0

Initial release to public.
