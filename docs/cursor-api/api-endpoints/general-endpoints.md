Core
Background Agents API
API Endpoints
General Endpoints
API Key Info
Retrieve metadata about the API key used for authentication.

GET
/
v0
/
me
Authorizations
​
Authorization
stringheaderrequired
API key from Cursor Dashboard

Response

200

application/json
API key information retrieved successfully

​
apiKeyName
stringrequired
The name of the API key

Example:
"Production API Key"

​
createdAt
string<date-time>required
When the API key was created

Example:
"2024-01-15T10:30:00Z"

​
userEmail
string<email>
Email address of the user who owns the API key (if available)

Example:
"developer@example.com"

API key info

Copy

Ask AI
curl --request GET \
 --url https://api.cursor.com/v0/me \
 --header 'Authorization: Bearer <token>'

200

401

404

429

500

Copy

Ask AI
{
"apiKeyName": "Production API Key",
"createdAt": "2024-01-15T10:30:00Z",
"userEmail": "developer@example.com"
}
