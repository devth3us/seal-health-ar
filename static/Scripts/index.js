
        const msg = "{{ messages[0] }}";
        if (msg === "error") {
          Swal.fire({
            icon: "error",
            title: "Usuário ou senha inválidos",
            confirmButtonText: "OK"
          });
        } else if (msg === "success") {
          Swal.fire({
            icon: "success",
            title: "Login realizado com sucesso!",
            confirmButtonText: "OK"
          }).then(() => {
            window.location.href = "/layout";
          });
        } else if (msg === "registered") {
          Swal.fire({
            icon: "success",
            title: "Cadastro realizado com sucesso!",
            confirmButtonText: "OK"
          });
        }
 
