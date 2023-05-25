import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("volumes.csv");
print(df.head())
#print the types
print(df.dtypes)
df["date"] = pd.to_datetime(df["date"])

#set x axis as day, y axis as Dollars wagered
#set plot title as Daily Volume at Purebet Since Launch
plt.plot(df["date"], df["volume"])
plt.suptitle("Daily Volume at Purebet Since Launch")
plt.title("In $")
plt.xlabel("Day")
plt.ylabel("Dollars Wagered")
plt.show()