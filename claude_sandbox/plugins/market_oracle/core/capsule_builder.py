"""
6-1-6 Temporal Capsule Builder
Constructs 73-dimensional causal context capsules from market data
"""


class CapsuleBuilder:
    """Builds 6-1-6 temporal capsules from market data"""
    
    def __init__(self, config):
        self.config = config
        self.prev_positions = config['analysis']['capsule_prev_positions']
        self.next_positions = config['analysis']['capsule_next_positions']
    
    def build(self, market_data):
        """
        Build 6-1-6 temporal capsules
        
        Each capsule contains:
        - anchor: Current position
        - prev_positions: Up to 6 previous positions
        - next_positions: Up to 6 next positions
        - price_change: % change from previous day
        - volume_change: % change in volume
        
        Args:
            market_data: List of market data dictionaries
        
        Returns:
            list: List of capsule dictionaries
        """
        capsules = []
        
        for i in range(len(market_data)):
            # Current anchor point
            anchor = market_data[i]
            
            # Previous positions (up to 6)
            prev_positions = []
            for j in range(1, self.prev_positions + 1):
                if i - j >= 0:
                    prev_positions.append(market_data[i - j])
            
            # Next positions (up to 6)
            next_positions = []
            for j in range(1, self.next_positions + 1):
                if i + j < len(market_data):
                    next_positions.append(market_data[i + j])
            
            # Calculate price change
            price_change = 0.0
            if i > 0:
                prev_close = market_data[i - 1]['close']
                price_change = ((anchor['close'] - prev_close) / prev_close) * 100
            
            # Calculate volume change
            volume_change = 0.0
            if i > 0 and market_data[i - 1]['volume'] > 0:
                prev_volume = market_data[i - 1]['volume']
                volume_change = ((anchor['volume'] - prev_volume) / prev_volume) * 100
            
            capsule = {
                'index': i,
                'date': anchor['date'],
                'anchor': anchor,
                'prev_positions': prev_positions,
                'next_positions': next_positions,
                'price_change': price_change,
                'volume_change': volume_change,
                'ncv_73': None  # Will be populated by causal analyzer
            }
            
            capsules.append(capsule)
        
        return capsules
