"""
Data Validator
Validates market data quality and completeness
"""


class DataValidator:
    """Validates market data quality"""
    
    def __init__(self, config):
        self.config = config
    
    def validate(self, market_data):
        """
        Validate market data
        
        Args:
            market_data: List of market data dictionaries
        
        Returns:
            bool: True if valid, False otherwise
        """
        if not market_data:
            return False
        
        if len(market_data) < 10:
            print("Insufficient data: Less than 10 trading days")
            return False
        
        # Check for required fields
        required_fields = ['date', 'open', 'high', 'low', 'close', 'volume']
        for item in market_data:
            for field in required_fields:
                if field not in item:
                    print(f"Missing required field: {field}")
                    return False
        
        # Check for data integrity
        for item in market_data:
            if item['high'] < item['low']:
                print(f"Data integrity error: high < low on {item['date']}")
                return False
            
            if item['close'] <= 0 or item['volume'] < 0:
                print(f"Data integrity error: invalid values on {item['date']}")
                return False
        
        return True
