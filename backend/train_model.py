import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

def train():
    df = pd.read_csv('data/waste_data.csv')
    
    # Encode categorical features
    waste_encoder = LabelEncoder()
    df['waste_type_encoded'] = waste_encoder.fit_transform(df['waste_type'])
    
    action_encoder = LabelEncoder()
    df['required_action_encoded'] = action_encoder.fit_transform(df['required_action'])
    
    X = df[['temperature_celsius', 'moisture_percent', 'ph_level', 'carbon_nitrogen_ratio', 'waste_type_encoded']]
    
    y_days = df['days_to_degrade']
    y_action = df['required_action_encoded']
    
    # Train random forest regressor for days
    regressor = RandomForestRegressor(n_estimators=100, random_state=42)
    regressor.fit(X, y_days)
    
    # Train random forest classifier for action
    classifier = RandomForestClassifier(n_estimators=100, random_state=42)
    classifier.fit(X, y_action)
    
    # Save models
    os.makedirs('models', exist_ok=True)
    with open('models/regressor.pkl', 'wb') as f:
        pickle.dump(regressor, f)
    with open('models/classifier.pkl', 'wb') as f:
        pickle.dump(classifier, f)
    with open('models/waste_encoder.pkl', 'wb') as f:
        pickle.dump(waste_encoder, f)
    with open('models/action_encoder.pkl', 'wb') as f:
        pickle.dump(action_encoder, f)
        
    print("Models and encoders saved to models/ directory.")

if __name__ == '__main__':
    train()
