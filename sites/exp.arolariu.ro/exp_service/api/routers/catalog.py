"""Catalog endpoints."""

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from authz import authorize_catalog_request
from catalog import get_catalog
from exp_service.api.common import API_VERSION_PREFIX, auth_error_response, error_response, utcnow_iso
from models import CatalogPayload

router = APIRouter(prefix=API_VERSION_PREFIX)


@router.get("/catalog", response_model=CatalogPayload)
def get_catalog_endpoint(
    req: Request,
    for_target: str = Query("", alias="for"),
) -> CatalogPayload | JSONResponse:
    """Get the catalog for a caller target (`for=api|website`)."""
    requested_target = for_target.strip().lower()
    if not requested_target:
        return error_response("Query parameter 'for' is required.", status_code=400)

    catalog = get_catalog(requested_target)
    if catalog is None:
        return error_response(f"Unknown catalog target '{requested_target}'.", status_code=400)

    authorization_result = authorize_catalog_request(req, requested_target)
    if not authorization_result.is_authorized:
        return auth_error_response(
            message=authorization_result.message,
            status_code=authorization_result.status_code,
        )

    return CatalogPayload(
        target=catalog.target,
        version=catalog.version,
        requiredKeys=catalog.requiredKeys,
        optionalKeys=catalog.optionalKeys,
        allowedPrefixes=catalog.allowedPrefixes,
        refreshIntervalSeconds=catalog.refreshIntervalSeconds,
        fetchedAt=utcnow_iso(),
    )

