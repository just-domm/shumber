
# ShambaPulse Backend Infrastructure (Prototype Documentation)

## 1. Amazon DynamoDB Schema
Designed for high-throughput marketplace operations in Nakuru County.

**Table Name: `ShambaPulse_Inventory`**
- **Partition Key (PK):** `CropID` (String) - Unique identifier for the produce lot.
- **Sort Key (SK):** `LocationID` (String) - Geographical identifier (e.g., `LOC#MOLO`, `LOC#BAHATI`).
- **Global Secondary Index (GSI):** 
  - PK: `Status` (Active/Sold)
  - SK: `Timestamp` (ISO String)
  - Purpose: For querying recent surplus across the county.

**Table Attributes:**
- `FarmerID`: String
- `CropName`: String
- `QuantityKg`: Number
- `QualityScore`: Number (0-100)
- `BasePriceKES`: Number
- `CurrentBidKES`: Number
- `HighestBidderID`: String
- `GeoPoint`: Map (Lat/Lng)

---

## 2. AWS Lambda Functions (Node.js)

### Function: `analyzeProduceQuality`
**Trigger:** POST `/analyze`
```javascript
const { GoogleGenAI } = require("@google/genai");

exports.handler = async (event) => {
    const { imageBase64 } = JSON.parse(event.body);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = ai.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = "Analyze produce freshness... (truncated)";
    const result = await model.generateContent([prompt, { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }]);
    
    return {
        statusCode: 200,
        body: result.response.text(),
    };
};
```

### Function: `placeBid`
**Trigger:** POST `/bid`
```javascript
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const { cropId, locationId, buyerId, amount } = JSON.parse(event.body);
    
    // Conditional update: only succeed if amount > currentBid
    const params = {
        TableName: 'ShambaPulse_Inventory',
        Key: { CropID: cropId, LocationID: locationId },
        UpdateExpression: 'SET CurrentBidKES = :amt, HighestBidderID = :bidder',
        ConditionExpression: 'CurrentBidKES < :amt',
        ExpressionAttributeValues: {
            ':amt': amount,
            ':bidder': buyerId
        }
    };

    try {
        await dynamo.update(params).promise();
        return { statusCode: 200, body: JSON.stringify({ message: "Bid successful" }) };
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ error: "Bid too low" }) };
    }
};
```
