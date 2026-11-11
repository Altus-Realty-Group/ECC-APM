"""Pure ECC storage path policy. No I/O, identity allocation or authorization.

Callers must separately prove registry identities, access and verified delivery.
A syntactically valid UUID or returned path is not evidence of those conditions.
"""
from datetime import date
import re
from uuid import UUID


ENVIRONMENTS = frozenset(('Production', 'Staging', 'Development'))
COLLECTIONS = frozenset(('Properties', 'Projects', 'Deals', 'Organizations', 'Operations', 'Reference'))
CATEGORIES = frozenset((
    '01_Property_and_Identity', '02_Photos_and_Video', '03_Plans_and_Measurements',
    '04_Inspections_and_Condition', '05_Scope_and_Estimates', '06_Contracts_and_Approvals',
    '07_Financial_and_Closing', '08_Reports_and_Analysis', '09_Permits_Utilities_and_Warranties',
    '10_Exchange_and_Delivery', '11_Administration', '12_Reference_and_Templates',
))
LIFECYCLES = frozenset(('Originals', 'Working', 'Published', 'Archive'))
MEDIA_EXTENSIONS = {
    'application/pdf': frozenset(('pdf',)),
    'image/jpeg': frozenset(('jpg', 'jpeg')),
    'image/png': frozenset(('png',)),
    'image/tiff': frozenset(('tif', 'tiff')),
    'video/mp4': frozenset(('mp4',)),
    'text/plain': frozenset(('txt',)),
    'text/markdown': frozenset(('md',)),
    'text/csv': frozenset(('csv',)),
    'message/rfc822': frozenset(('eml',)),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': frozenset(('xlsx',)),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': frozenset(('docx',)),
}
RESERVED = frozenset(('con', 'prn', 'aux', 'nul', *(f'com{i}' for i in range(1, 10)),
                      *(f'lpt{i}' for i in range(1, 10))))


class PathPolicyError(ValueError):
    pass


def require(condition):
    if not condition:
        raise PathPolicyError('ECC document path requires review')


def checked_slug(value, maximum):
    require(isinstance(value, str) and len(value) <= maximum
            and re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', value) is not None
            and value not in RESERVED)
    return value


def checked_uuid(value):
    require(isinstance(value, str))
    try:
        identifier = UUID(value)
    except ValueError:
        raise PathPolicyError('ECC document path requires review') from None
    require(str(identifier) == value and identifier.int != 0)
    return value


def build_document_path(*, environment, collection, record_slug, record_id,
                        category, lifecycle, document_id, intake_date,
                        document_type, revision, extension, media_type,
                        subcategories=(), rendition=None):
    """Return a proposed canonical placement, never a delivery/registry receipt.

    The UUIDs must come from accepted registry records, not this function.
    Dates are UTC intake/generation dates supplied by the caller. Original names
    and effective dates remain separate metadata. Subcategories are fixed local
    labels placed after Category; no owner level is inserted before the record.
    """
    require(isinstance(environment, str) and environment in ENVIRONMENTS)
    require(isinstance(collection, str) and collection in COLLECTIONS)
    require(isinstance(category, str) and category in CATEGORIES)
    require(isinstance(lifecycle, str) and lifecycle in LIFECYCLES)
    checked_slug(record_slug, 40)
    checked_uuid(record_id)
    checked_uuid(document_id)
    checked_slug(document_type, 32)
    require(type(revision) is int and revision > 0)
    require(isinstance(media_type, str) and isinstance(extension, str)
            and extension in MEDIA_EXTENSIONS.get(media_type, ()))
    require(isinstance(intake_date, str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', intake_date) is not None)
    try:
        date.fromisoformat(intake_date)
    except ValueError:
        raise PathPolicyError('ECC document path requires review') from None
    require(type(subcategories) in (tuple, list))
    for label in subcategories:
        require(isinstance(label, str) and len(label) <= 40
                and re.fullmatch(r'[A-Za-z0-9]+(?:_[A-Za-z0-9]+)*', label) is not None
                and label.casefold() not in RESERVED)
    suffix = '' if rendition is None else '__' + checked_slug(rendition, 32)
    filename = f'{intake_date}__{document_type}__{document_id}__v{revision:04d}{suffix}.{extension}'
    relative = '/'.join(('ECC', environment, collection, record_slug + '__' + record_id,
                         category, *subcategories, lifecycle, document_id, filename))
    require(len(relative) <= 400)
    return '/Altus App Folder/' + relative
