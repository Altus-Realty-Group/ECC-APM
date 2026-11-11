import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from ecc_document_paths import build_document_path, PathPolicyError


def placement(**changes):
    args = dict(environment='Production', collection='Properties', record_slug='synthetic-property',
                record_id='11111111-1111-4111-8111-111111111111', category='11_Administration',
                lifecycle='Originals', document_id='22222222-2222-4222-8222-222222222222',
                intake_date='2026-11-11', document_type='court-order', revision=1,
                extension='pdf', media_type='application/pdf', subcategories=('Legal', 'Court'))
    return build_document_path(**(args | changes))


class DocumentPathTests(unittest.TestCase):
    def test_exact_canonical_layout_has_no_owner_insertion(self):
        self.assertEqual(placement(), '/Altus App Folder/ECC/Production/Properties/'
            'synthetic-property__11111111-1111-4111-8111-111111111111/'
            '11_Administration/Legal/Court/Originals/22222222-2222-4222-8222-222222222222/'
            '2026-11-11__court-order__22222222-2222-4222-8222-222222222222__v0001.pdf')
        self.assertEqual(placement(), placement())

    def test_environments_records_and_documents_have_distinct_paths(self):
        base = placement()
        self.assertNotEqual(base, placement(environment='Staging'))
        self.assertNotEqual(base, placement(record_id='33333333-3333-4333-8333-333333333333'))
        self.assertNotEqual(base, placement(document_id='33333333-3333-4333-8333-333333333333'))

    def test_revisions_and_renditions_do_not_overwrite_same_identity(self):
        self.assertTrue(placement(revision=10000).endswith('__v10000.pdf'))
        self.assertTrue(placement(rendition='redacted').endswith('__v0001__redacted.pdf'))
        self.assertNotEqual(placement(), placement(revision=2))
        self.assertNotEqual(placement(), placement(rendition='signed'))

    def test_unsafe_and_ambiguous_components_are_rejected(self):
        for field in ('record_slug', 'document_type', 'rendition'):
            for value in ('../escape', 'name/path', 'name\\path', 'name ', 'name.', 'NAME', 'a--b', 'con', 'lpt1', 'a\n'):
                with self.subTest(field=field, value=value), self.assertRaises(PathPolicyError):
                    placement(**{field: value})

    def test_missing_truncated_noncanonical_and_nil_ids_are_rejected(self):
        for field in ('record_id', 'document_id'):
            for value in (None, '22222222', '22222222222242228222222222222222',
                          '00000000-0000-0000-0000-000000000000', 'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA'):
                with self.subTest(field=field, value=value), self.assertRaises(PathPolicyError):
                    placement(**{field: value})

    def test_only_defined_categories_collections_environments_and_lifecycles(self):
        for field, value in (('category', '13_Legal'), ('collection', 'Owners'),
                             ('environment', 'production'), ('lifecycle', 'Public')):
            with self.subTest(field=field), self.assertRaises(PathPolicyError): placement(**{field: value})

    def test_invalid_dates_revisions_and_media_mismatches_are_rejected(self):
        for field, values in (('intake_date', ('2026-02-30', '20261111', '2026-11-11T00:00:00Z')),
                              ('revision', (False, True, 0, -1, '1', 1.5)),
                              ('extension', ('PDF', 'exe', 'jpg')),
                              ('media_type', ('image/png', 'application/octet-stream'))):
            for value in values:
                with self.subTest(field=field, value=value), self.assertRaises(PathPolicyError): placement(**{field: value})

    def test_subcategories_cannot_escape_placement_or_exceed_portability_limit(self):
        for value in ('Legal', ('..',), ('Legal/Other',), ('Legal ',), ('CON',), tuple('A' * 40 for _ in range(8))):
            with self.subTest(value=value), self.assertRaises(PathPolicyError): placement(subcategories=value)

    def test_label_limits_are_enforced_without_truncating_identity(self):
        for field, length in (('record_slug', 41), ('document_type', 33), ('rendition', 33)):
            with self.subTest(field=field), self.assertRaises(PathPolicyError): placement(**{field: 'a' * length})

    def test_restricted_intake_uses_operations_without_guessing_property(self):
        result = placement(collection='Operations', record_slug='unresolved-legal-intake', subcategories=('Legal', 'Intake'))
        self.assertIn('/Operations/unresolved-legal-intake__', result)
        self.assertNotIn('/Properties/', result)


if __name__ == '__main__': unittest.main()
