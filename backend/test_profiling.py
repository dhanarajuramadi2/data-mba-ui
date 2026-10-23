
from app.services.profiling_service import profile_csv

sample_csv = b"""customer_id,name,city,age
101,Asha,Bengaluru,28
102,Ravi,Mysuru,35
103,,Bengaluru,28
103,,Bengaluru,28
"""

result = profile_csv(sample_csv)

print(result)
