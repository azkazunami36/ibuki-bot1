export interface errortype {
    addurl: boolean;
    notsplist: boolean;
    notlplist: boolean;
    notpublplist: boolean;
    notpubsplist: boolean;
    ytdlurlorid: boolean;
    playinguser: boolean;
    playing: boolean;
    plistempty: boolean;
    noplaying: boolean;
    nullnumber: boolean;
    stringlengthis: boolean;
    notplist: boolean;
    zeroplist: boolean;
    zeropubplist: boolean;
    notadminispub: boolean;
    notpubplist: boolean;
    noytcontent: boolean
}
export interface data {
    subcontent: string;
    serverid: string;
    channelid: string;
    userid: string;
    plist: [];
    number: Number;
}