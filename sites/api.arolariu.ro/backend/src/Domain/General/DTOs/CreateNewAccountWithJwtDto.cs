namespace arolariu.Backend.Core.Domain.General.DTOs
{
    /// <summary>
    /// This class represents the data transfer object (DTO) for the create new account with JWT endpoint.
    /// </summary>
    public class CreateNewAccountWithJwtDto
    {
        /// <summary>
        /// The username of the account.
        /// </summary>
        public required string Username { get; set; } = string.Empty;
        
        /// <summary>
        /// The password of the account.
        /// </summary>
        public required string Password { get; set; } = string.Empty;
        
        /// <summary>
        /// The email of the account.
        /// </summary>
        public required string Email { get; set; } = string.Empty;
    }
}
