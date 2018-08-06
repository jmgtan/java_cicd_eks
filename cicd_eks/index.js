const os = require("os");
const download = require("download-file");
const util = require("util");
const downloadPromise = util.promisify(download);
const path = require("path");
const fs = require("fs");
const binPerm = "0755";
const execAsync = util.promisify(require("child_process").exec);
const execCmd = "%s --kubeconfig %s %s";

const authenticatorPath = "/tmp/aws-iam-authenticator";
const kubectlPath = "/tmp/kubectl";

const authenticatorMap = {
    "linux": "https://amazon-eks.s3-us-west-2.amazonaws.com/1.10.3/2018-07-26/bin/linux/amd64/aws-iam-authenticator",
    "darwin": "https://amazon-eks.s3-us-west-2.amazonaws.com/1.10.3/2018-07-26/bin/darwin/amd64/aws-iam-authenticator"
}

const kubectlMap = {
    "linux": "https://amazon-eks.s3-us-west-2.amazonaws.com/1.10.3/2018-07-26/bin/linux/amd64/kubectl",
    "darwin": "https://amazon-eks.s3-us-west-2.amazonaws.com/1.10.3/2018-07-26/bin/darwin/amd64/kubectl"
}

exports.handler = async(event) => {
    console.log(event);
    await configureEnvironment();
    var output = await executeCommand();
    console.log(output.stdout);
}

async function configureEnvironment() {
    if (os.platform() in authenticatorMap) {
        if (!fs.existsSync(authenticatorPath)) {
            var authenticatorUrl = authenticatorMap[os.platform()];
            await downloadPromise(authenticatorUrl, {directory: path.dirname(authenticatorPath), filename: path.basename(authenticatorPath)});
            fs.chmodSync(authenticatorPath, binPerm);
        }
    } 

    if (os.platform() in kubectlMap) {
        if (!fs.existsSync(kubectlPath)) {
            var kubectlUrl = kubectlMap[os.platform()];
            await downloadPromise(kubectlUrl, {directory: path.dirname(kubectlPath), filename: path.basename(kubectlPath)});
            fs.chmodSync(kubectlPath, binPerm);
        }
    }
}

async function executeCommand() {
    return await execAsync(util.format(execCmd, kubectlPath, __dirname+"/config", "get svc"));
}