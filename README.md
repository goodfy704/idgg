This is qualification work for university. The website is about displaying any player statistic from popular videogame "League of Legends".

To start first things first you need valid Riot Games account. If you have you are almost done running the project on your local machine!
Clone the repo. Then visit Riot dev website: https://developer.riotgames.com/. Login into your Riot Games account:
![image](https://github.com/user-attachments/assets/0dbd93f6-5940-4dad-8ac7-9c1be68576f3)

You can find Riot api key in you dashboard. Generate new and copy it:
![image](https://github.com/user-attachments/assets/da2f5abc-ae1d-4bf4-b371-b4346d9ff4ae)

In proxyServer.js find API_KEY variable and paste your api key:
![image](https://github.com/user-attachments/assets/e24245e3-5fb7-4027-b9fe-2f90e92c3444)

now while in proxyServer.js directory run this command:
  npm start
It will start server on port:4000.
Then open new terminal and go into %PATH%/idgg/ and run same command:
  npm start
It will start react on port:3200.
Congratulations now you can use the website! Here are some player usernames and taglines that you can paste in the search: 熟能生巧#FIRST, Never Enough#Dota3, æ Closest#EUW, Truperos#SHIZO.
