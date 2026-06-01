import pandas as pd
import numpy as np
import random
import os

def generate_data(num_rows=1000):
    np.random.seed(42)
    random.seed(42)
    
    waste_types = ['Market_Vegetable', 'Mixed_Household', 'Yard_Waste']
    actions = ['Add_Sawdust_Carbon', 'Add_Water', 'Add_Bacillus_Enzyme', 'Turn_Pile_Aeration', 'Optimal_No_Action']
    
    data = []
    for _ in range(num_rows):
        temp = round(random.uniform(30.0, 75.0), 1)
        moisture = round(random.uniform(20.0, 80.0), 1)
        ph = round(random.uniform(4.5, 8.5), 1)
        cn_ratio = round(random.uniform(15.0, 45.0), 1)
        waste = random.choice(waste_types)
        
        # Calculate days to degrade based on inputs
        # Optimal: temp ~55-65, moisture ~50-60, ph ~6.5-7.5, cn ~25-30
        temp_penalty = abs(temp - 60) * 0.5
        moisture_penalty = abs(moisture - 55) * 0.4
        ph_penalty = abs(ph - 7.0) * 5
        cn_penalty = abs(cn_ratio - 28) * 0.6
        
        base_days = 20
        if waste == 'Market_Vegetable':
            base_days = 15
        elif waste == 'Yard_Waste':
            base_days = 25
            
        days = int(base_days + temp_penalty + moisture_penalty + ph_penalty + cn_penalty)
        days_to_degrade = max(15, min(50, days))
        
        # Determine required action
        if moisture < 40:
            required_action = 'Add_Water'
        elif cn_ratio < 20: # High nitrogen, need carbon
            required_action = 'Add_Sawdust_Carbon'
        elif temp < 40:
            required_action = 'Add_Bacillus_Enzyme'
        elif temp > 65 or moisture > 65:
            required_action = 'Turn_Pile_Aeration'
        else:
            required_action = 'Optimal_No_Action'
            
        data.append({
            'temperature_celsius': temp,
            'moisture_percent': moisture,
            'ph_level': ph,
            'carbon_nitrogen_ratio': cn_ratio,
            'waste_type': waste,
            'days_to_degrade': days_to_degrade,
            'required_action': required_action
        })
        
    df = pd.DataFrame(data)
    os.makedirs('data', exist_ok=True)
    df.to_csv('data/waste_data.csv', index=False)
    print("Mock data generated at data/waste_data.csv")

if __name__ == '__main__':
    generate_data()
