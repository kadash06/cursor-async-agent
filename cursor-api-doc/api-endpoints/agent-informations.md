Core
Background Agents API
API Endpoints
Agent Information
List Agents
Retrieve a paginated list of all background agents for the authenticated user.

GET
/
v0
/
agents
Authorizations
​
Authorization
stringheaderrequired
API key from Cursor Dashboard

Query Parameters
​
limit
integerdefault:20
Number of background agents to return

Required range: 1 <= x <= 100
​
cursor
string
Pagination cursor from the previous response

Minimum length: 1
Example:
"bc_xyz789"

Response

200

application/json
Agents retrieved successfully

​
agents
object[]required
List of agents

Show child attributes

​
nextCursor
string
Cursor for fetching the next page of results

Example:
"bc_def456"

Was this page helpful?

Yes

No
Webhooks
Agent Status
Ask a question...
