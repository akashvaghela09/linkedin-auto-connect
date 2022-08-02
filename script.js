///////////////////////////      For Async Interval     ///////////////////////////
const asyncIntervals = [];

const runAsyncInterval = async (cb, interval, intervalIndex) => {
    await cb();
    if (asyncIntervals[intervalIndex]) {
        setTimeout(() => runAsyncInterval(cb, interval, intervalIndex), interval);
    }
};

const setAsyncInterval = (cb, interval) => {
    if (cb && typeof cb === "function") {
        const intervalIndex = asyncIntervals.length;
        asyncIntervals.push(true);
        runAsyncInterval(cb, interval, intervalIndex);
        return intervalIndex;
    } else {
        throw new Error('Callback must be a function');
    }
};

const clearAsyncInterval = (intervalIndex) => {
    if (asyncIntervals[intervalIndex]) {
        asyncIntervals[intervalIndex] = false;
    }
};
/////////////////////////////////////////////////////////////////////////////////

let infoLabel = document.getElementById("infoLabel");
let count = document.getElementById("count");
let startBtn = document.getElementById("start")
let stopBtn = document.getElementById("stop")

let totalButtons = [];
let autopilot = true;
let totalRequestSentCount = 0;

const checkForConnectButton = async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: collectAllConnectButtons,
    }, async (injection) => {
        let items = injection[0].result;
        totalButtons = [...items]
        infoLabel.innerText = `Connect Buttons Found`
        count.innerText = `${items.length}`
    })
}

const collectAllConnectButtons = async () => {
    // Grab Connect Buttons
    let nodeList = document.querySelectorAll(".artdeco-button.artdeco-button--2.artdeco-button--secondary.ember-view");
    let connectButton = [];

    // Filter out people who has connect button (exclude message button)
    for (let i = 0; i < nodeList.length; i++) {
        let item = nodeList[i].children[0].innerText
        if (item.includes("Connect")) {
            connectButton.push(nodeList[i].id)
        }
    }
    return [...connectButton];
}



const sendConnectionRequest = async (item) => {
    let modalType = {
        "customizeInvitation": () => {
            let sendButton = document.querySelector(".artdeco-button.artdeco-button--2.artdeco-button--primary.ember-view.ml1")
            let closeButton = document.querySelector(".artdeco-modal__dismiss.artdeco-button.artdeco-button--circle.artdeco-button--muted.artdeco-button--2.artdeco-button--tertiary.ember-view")
            sendButton.click();
            closeButton.click();
            console.log("Connection request sent")
            return { status: true, count: 1 };
        },
        "connect": () => {
            let closeButton = document.querySelector(".artdeco-modal__dismiss.artdeco-button.artdeco-button--circle.artdeco-button--muted.artdeco-button--2.artdeco-button--tertiary.ember-view")
            closeButton.click()
            console.log("Not Possible to connect")

            return { status: true, count: 0 };
        },
        "howDoYouKnow": () => {
            let ele = document.querySelectorAll(".artdeco-pill.artdeco-pill--slate.artdeco-pill--3.artdeco-pill--choice.ember-view.mt2")
            ele[4].click()

            let newConnectButton = document.querySelector(".artdeco-button.artdeco-button--2.artdeco-button--primary.ember-view")
            newConnectButton.click()
            console.log("Doing some checks ...")

            return { status: false, count: 0 };
        },
        "considerFollowing": () => {
            let connectButton = document.querySelector(".artdeco-button.artdeco-button--muted.artdeco-button--2.artdeco-button--secondary.ember-view.mr2")
            console.log("Still trying to send connection request")
            connectButton.click()

            return { status: false, count: 0 };
        }
    }

    const checkForModalType = () => {
        setTimeout(() => {
            let sendModal = document.getElementById("send-invite-modal")
            let modalHeader = sendModal && sendModal.textContent.trim("");
            if (modalHeader === "Connect") {
                modalType.connect()
                checkForModalType()
            } else if (modalHeader === "You can customize this invitation") {
                let { status, count } = modalType.customizeInvitation()
                if (!status) return checkForModalType();
            } else if (modalHeader.includes("How do you know")) {
                let { status } = modalType.howDoYouKnow()
                if (!status) return checkForModalType()
            } else if (modalHeader === "Consider following or messaging instead") {
                let { status } = modalType.considerFollowing()
                if (!status) return checkForModalType()
            } else if (sendModal === null) {
                console.log("All Checks are done")
                return;
            }
        }, 1000);  
    }

    let itemFound = document.getElementById(item);
    itemFound.click()
    checkForModalType()

    return 1;
}

const initiateSendRequest = async () => {
    let intervalTime  = Math.floor(Math.random() * (5000 - 2000 + 1)) + 2000;

    setAsyncInterval(async () => {
        item = totalButtons.shift()
        const promise = new Promise((resolve) => {
            setTimeout(async () => {
                let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    args: [item],
                    function: sendConnectionRequest
                }, async (injection) => {
                    let result = injection[0].result;
                    totalRequestSentCount += result;

                    if(autopilot === false || totalButtons.length === 0) {
                        infoLabel.innerText = `${totalRequestSentCount} Connection Request Sent`
                        stopBtn.style.display = "none";
                        startBtn.style.display = "block";
                    } else {
                        infoLabel.innerText = `Sending Connection Request`
                    }

                    count.innerText = `${totalRequestSentCount}`
                })
             
                resolve('all done')
            }, 1000);
        });
        await promise;

        if (totalButtons.length === 0 || autopilot === false) {
            if (autopilot === false) {
                console.log("autopilot stopped")
            }
            clearAsyncInterval(0)
        }
    }, intervalTime);
}


startBtn.addEventListener("click", async () => {
    startBtn.style.display = "none";
    stopBtn.style.display = "block";
    
    initiateSendRequest()
})

stopBtn.addEventListener("click", () => {
    stopBtn.style.display = "none";
    startBtn.style.display = "block";
    autopilot = false;
})


checkForConnectButton()