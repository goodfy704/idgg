import React from "react";

const summonerItems = ({ gameData, summoner, itemUrl }) => {
        const userPUUID = summoner.puuid;
        const userParticipant = gameData.info.participants.find(
            (participant) => participant.puuid === userPUUID
        );
        if(userParticipant)
        {
            var item0 = userParticipant.item0;
            var item1 = userParticipant.item1;
            var item2 = userParticipant.item2;
            var item3 = userParticipant.item3;
            var item4 = userParticipant.item4;
            var item5 = userParticipant.item5;
            var item6 = userParticipant.item6;

            return (
                <>
                    <div className="flex mt-1">
                        {item0 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item0 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                        {item1 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item1 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                        {item2 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item2 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                        {item6 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item6 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                    </div>
                    <div className="flex">
                        {item3 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item3 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                        {item4 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item4 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                        {item5 !== 0 ? (
                            <img
                                className="w-8 h-8 rounded-lg"
                                alt=""
                                src={itemUrl + item5 + ".png"}
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-lg border border-deep-charocal"></div>
                        )}
                    </div>
                </>
            )
        }
    };

export default summonerItems;