
        const msg = "{{ messages[0] }}";
        if (msg === "sucess") {
          Swal.fire({
            icon: "success",
            title: "Login realizado com sucesso!",
            confirmButtonText: "OK"
          });
        } else if (msg === "error") {
          Swal.fire({
            icon: "error",
            title: "usuario ou senha invalido!",
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
