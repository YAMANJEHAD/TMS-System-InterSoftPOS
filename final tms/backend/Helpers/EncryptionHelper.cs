using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;

namespace Backend.Helpers
{
    public static class EncryptionHelper
    {
        private static readonly string SecretKey = "b7F9d8A4s3JkL0mN1qR2vX5zC6tH8wY0";
        private static readonly byte[] KeyBytes = Encoding.UTF8.GetBytes(SecretKey);

        private static readonly byte[] Iv = new byte[16];

        public static string Encrypt(string plainText)
        {
            using Aes aes = Aes.Create();
            aes.Key = KeyBytes;
            aes.IV = Iv;
            aes.Mode = CipherMode.CBC;

            using MemoryStream ms = new();
            using (CryptoStream cs = new(ms, aes.CreateEncryptor(), CryptoStreamMode.Write))
            using (StreamWriter sw = new(cs))
            {
                sw.Write(plainText);
            }

            return Convert.ToBase64String(ms.ToArray());
        }

        public static string Decrypt(string cipherText)
        {
            byte[] cipherBytes = Convert.FromBase64String(cipherText);
            using Aes aes = Aes.Create();
            aes.Key = KeyBytes;
            aes.IV = Iv;
            aes.Mode = CipherMode.CBC;

            using MemoryStream ms = new(cipherBytes);
            using CryptoStream cs = new(ms, aes.CreateDecryptor(), CryptoStreamMode.Read);
            using StreamReader sr = new(cs);
            return sr.ReadToEnd();
        }
    }
}
