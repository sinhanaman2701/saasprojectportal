# Kolte Patil Portal - Final API Document V2

This document rigorously maps the explicit constraints originally housed within `Finalportaldoc.pdf`, actively upgraded to support the 14-point database expansion for the V4 architecture. It serves as the official integration contract for the Mobile App consumption developers.

## POST `/projects/list` Data Contract

This exclusive payload natively packages all of the newly tracked amenities and distances securely combined with the undisturbed original layout.

### Request Headers
- `Access-Token`: `<Generated JWT Dynamic Token String>`
- `Content-Type`: `application/json`

### Request Body
```json
{
  "page": "1",
  "limit": "10"
}
```

### JSON Response Schema

The Mobile Endpoint will strictly retain the original schema footprint to protect backwards compatibility, dropping only `preference` out of the overview block, before cleanly appending the new variables seamlessly at the tail.

```json
{
  "status_code": 200,
  "status_message": "Success",
  "response_data": [
    {
      "projectId": 12356,
      "projectName": "Casa Venero",
      "description": "test",
      "location": "dubai",
      "locationIframe": "<iframe src='...'></iframe>",
      "projectStatus": "ONGOING",
      "thumbnail": "https://s3/...",
      "overview": {
        "bedrooms": 3,
        "furnishing": "Furnished",
        "floor": "2nd Floor",
        "area": "2000 sqft"
      },
      "project_brochure": "https://image.mp4",
      "attachments": [
        {
          "name": "img_1",
          "imageUrl": "https://image.jpg",
          "extension": "PNG"
        }
      ],
      "communityAmenities": [
        { "name": "Swimming Pool", "image": "https://s3/..." }
      ],
      "propertyAmenities": [
        { "name": "CCTV", "icon": "https://s3/..." }
      ],
      "nearbyPlaces": [
        { "category": "Hospital", "distanceKm": 5.2, "icon": "https://s3/..." }
      ]
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 10,
    "total_items": 1,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```
