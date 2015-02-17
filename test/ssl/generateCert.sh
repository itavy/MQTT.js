#!/bin/bash
WORKDIR=$(cd ${0%/*} && echo $PWD);
export KEY_DIR="$WORKDIR"
which openssl 2>/dev/null
if [ 0 -ne $? ]; then
  echo "openssl not in path, please change the OPENSSLCMD variable";
  exit 1;
fi
OPENSSLCMD=`which openssl`
SSLCONFIG="-config $WORKDIR/openssl.cnf";
V3EXTFILE="-extfile $WORKDIR/v3.ext";
export KEY_COUNTRY="RO"
export KEY_PROVINCE="BU";
export KEY_CITY="Bucharest";
export KEY_ORG="itavy";
export KEY_EMAIL="itavyg@gmail.com";
export KEY_UNAME="itavy";

cd "$WORKDIR";
echo "1000" > crlnumber
touch index.txt

echo "###################################################";
echo "#################GENERATE CA#######################";
echo "##                                               ##";
echo "## it will ask you for a password, remember it   ##";
echo "## because you will need it to sign the          ##";
echo "## certificates for server and client            ##";
echo "##                                               ##";
echo "###################################################";
echo "###################################################";
export KEY_COMMONNAME="localhost_ca";
$OPENSSLCMD req -new -x509 -days 3650 -keyout localhost_ca.key -out localhost_ca.crt $SSLCONFIG

echo "###################################################";
echo "###########GENERATE CA CRL REVOCATION##############";
echo "##                                               ##";
echo "## it will ask you for the password from         ##";
echo "## previous step                                 ##";
echo "##                                               ##";
echo "###################################################";
echo "###################################################";
echo "1000" > crlnumber
touch index.txt
export KEY_COMMONNAME="localhost_ca";
$OPENSSLCMD ca $SSLCONFIG $V3EXTFILE -keyfile localhost_ca.key -cert localhost_ca.crt -gencrl -out localhost_ca.crl


echo "###################################################";
echo "##############GENERATE SERVER KEY##################";
echo "##                                               ##";
echo "##                                               ##";
echo "###################################################";
echo "###################################################";
export KEY_COMMONNAME="localhost";
$OPENSSLCMD genrsa -out localhost_srv.key 2048 $SSLCONFIG

echo "###################################################";
echo "########GENERATE SERVER REQUEST FOR SIGNING########";
echo "##                                               ##";
echo "## when it asks for a chalenge password,         ##";
echo "## press <enter> (no password):                  ##";
echo "##                                               ##";
echo "## Please enter the following 'extra' attributes ##";
echo "## to be sent with your certificate request      ##";
echo "## A challenge password []:                      ##";
echo "##                                               ##";
echo "###################################################";
echo "###################################################";
$OPENSSLCMD req -out localhost_srv.csr -key localhost_srv.key -new $SSLCONFIG

echo "###################################################";
echo "#############SIGN SERVER CERTIFICATE###############";
echo "##                                               ##";
echo "## when it will ask for password, enter the one  ##";
echo "## you entered in step 1 for CA                  ##";
echo "##                                               ##";
echo "###################################################";
echo "###################################################";
$OPENSSLCMD x509 -req -in localhost_srv.csr $V3EXTFILE -CA localhost_ca.crt -CAkey localhost_ca.key -CAcreateserial -out localhost_srv.crt -days 3650 


echo "###################################################";
echo "##############GENERATE CLIENT KEY##################";
echo "##                                               ##";
echo "## remember the password because it will ask for ##";
echo "## it when you make the request for signing      ##";
echo "##                                               ##";
echo "###################################################";
echo "###################################################";
export KEY_COMMONNAME="client";
SUBJECTKEY="/C=$KEY_COUNTRY/ST=$KEY_PROVINCE/L=$KEY_CITY/O=$KEY_ORG/OU=$KEY_UNAME/emailAddress=$KEY_EMAIL/CN=$KEY_COMMONNAME"
$OPENSSLCMD genrsa -out client.key 2048 $SSLCONFIG

echo "###################################################";
echo "########GENERATE CLIENT REQUEST FOR SIGNING########";
echo "##                                               ##";
echo "## when it asks for a chalenge password,         ##";
echo "## press <enter> (no password):                  ##";
echo "##                                               ##";
echo "## Please enter the following 'extra' attributes ##";
echo "## to be sent with your certificate request      ##";
echo "## A challenge password []:                      ##";
echo "##                                               ##";
echo "###################################################";
echo "###################################################";
$OPENSSLCMD req -out client.csr -key client.key -new $SSLCONFIG -subj "$SUBJECTKEY"


echo "###################################################";
echo "#############SIGN CLIENT CERTIFICATE###############";
echo "##                                               ##";
echo "## when it will ask for password, enter the one  ##";
echo "## you entered in step 1 for CA                  ##";
echo "##                                               ##";
echo "###################################################";
echo "###################################################";
openssl x509 -req -in client.csr $V3EXTFILE -CA localhost_ca.crt -CAkey localhost_ca.key -CAcreateserial -out client.crt -days 3650 

echo "###################################################";
echo "#####################DONE##########################"
echo "###################################################";

